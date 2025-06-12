import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { prisma } from '../../../lib/prisma';
import { getUserFromToken } from '../../../lib/auth';

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

  // Extra fields to decide where to save the photo
  const galerieId = formData.get('galerieId');    // present if photo is for private gallery
  const isPublic = formData.get('isPublic') === 'true'; // 'true' string means public gallery

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const filename = `photo_${user.id}_${Date.now()}.webp`;
  const filepath = path.join(process.cwd(), 'public/uploads', filename);

  await fs.mkdir(path.dirname(filepath), { recursive: true });
  await sharp(buffer).resize(600).webp({ quality: 80 }).toFile(filepath);

  const photoUrl = `/uploads/${filename}`; 

  if (galerieId) {
    // Photo pour galerie privée
    const photo = await prisma.photo.create({
      data: {
        url: photoUrl,
        utilisateurId: user.id,
        galeriePriveeId: parseInt(galerieId),
      }
    });
    return NextResponse.json(photo);
  }

  if (isPublic) {
    // Photo pour galerie publique
    const photo = await prisma.photo.create({
      data: {
        url: photoUrl,
        utilisateurId: user.id,
        galeriePriveeId: null, // pas dans galerie privée
      }
    });
    return NextResponse.json(photo);
  }

  // Sinon, c'est une photo de profil : on supprime l'ancienne et on met à jour utilisateur
  const currentUser = await prisma.utilisateur.findUnique({
    where: { id: user.id },
    select: { photoUrl: true }
  });

  if (currentUser.photoUrl) {
    const oldPath = path.join(process.cwd(), 'public', currentUser.photoUrl);
    try {
      await fs.unlink(oldPath);
    } catch (e) {
      console.warn("Impossible de supprimer l'ancienne image (peut-être déjà supprimée).");
    }
  }

  await prisma.utilisateur.update({
    where: { id: user.id },
    data: { photoUrl }
  });

  return NextResponse.json({ success: true, photoUrl });
}
