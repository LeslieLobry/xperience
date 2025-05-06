import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { prisma } from '../../../lib/prisma';
import { getUserFromToken } from '../../../lib/auth';

export async function POST(req) {
  const cookieStore = cookies();
  const user = getUserFromToken(cookieStore);

  if (!user || !user.id) {
    return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('photo');

  if (!file || typeof file === 'string') {
    return NextResponse.json({ success: false, message: 'Fichier invalide' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const filename = `gallery_${user.id}_${Date.now()}.webp`;
  const filepath = path.join(process.cwd(), 'public/uploads', filename);

  await fs.mkdir(path.dirname(filepath), { recursive: true });
  await sharp(buffer).resize(600).webp({ quality: 80 }).toFile(filepath);

  const photoUrl = `/uploads/${filename}`;

  // ✅ Enregistrement dans la table Photo
  const photo = await prisma.photo.create({
    data: {
      url: photoUrl,
      utilisateurId: user.id,
    },
  });

  return NextResponse.json(photo);
}
