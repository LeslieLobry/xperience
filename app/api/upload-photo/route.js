import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '../../../lib/prisma';
import { getUserFromToken } from '../../../lib/auth';
import { s3 } from '../../../lib/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';

export async function POST(req) {
  const cookieStore = cookies();
  const user = await getUserFromToken(cookieStore);

  if (!user || !user.id) {
    return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('photo');

  if (!file || typeof file === 'string') {
    return NextResponse.json({ success: false, message: 'Fichier invalide' }, { status: 400 });
  }

  const galerieId = formData.get('galerieId');
  const isPublic = formData.get('isPublic') === 'true';

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const filename = `photo_${user.id}_${Date.now()}_${file.name}`;
  const bucket = process.env.AWS_S3_BUCKET;

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: filename,
    Body: buffer,
    ContentType: file.type,
  }));

  const photoUrl = `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;

  // 💾 Galerie privée
  if (galerieId && !isNaN(parseInt(galerieId))) {
    let galerie = await prisma.galeriePrivee.findUnique({
      where: { id: parseInt(galerieId) },
    });

    // ✅ Création automatique si la galerie n'existe pas
    if (!galerie) {
      galerie = await prisma.galeriePrivee.create({
        data: {
          utilisateurId: user.id,
          nom: `Galerie privée de ${user.pseudo || "Utilisateur"}`,
        }
      });
    }

    const photo = await prisma.photo.create({
      data: {
        url: photoUrl,
        utilisateurId: user.id,
        galeriePriveeId: galerie.id,
      }
    });

    return NextResponse.json(photo);
  }

  // 💾 Galerie publique
  if (isPublic) {
    const photo = await prisma.photo.create({
      data: {
        url: photoUrl,
        utilisateurId: user.id,
        galeriePriveeId: null,
      }
    });
    return NextResponse.json(photo);
  }

  // 💾 Photo de profil
  await prisma.utilisateur.update({
    where: { id: user.id },
    data: { photoUrl }
  });

  return NextResponse.json({ success: true, photoUrl });
}
