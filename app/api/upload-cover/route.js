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
  const file = formData.get('cover');

  if (!file || typeof file === 'string') {
    return NextResponse.json({ success: false, message: 'Fichier invalide' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const filename = `cover_${user.id}_${Date.now()}.webp`;
  const filepath = path.join(process.cwd(), 'public/uploads', filename);

  // 🔁 Supprimer l’ancienne cover si présente
  const currentUser = await prisma.utilisateur.findUnique({
    where: { id: user.id },
    select: { coverUrl: true }
  });

  if (currentUser.coverUrl) {
    const oldPath = path.join(process.cwd(), 'public', currentUser.coverUrl);
    try {
      await fs.unlink(oldPath);
    } catch (e) {
      console.warn("Impossible de supprimer l'ancienne cover (peut-être déjà supprimée).");
    }
  }

  // 📷 Convertir en WebP avec Sharp
  await fs.mkdir(path.dirname(filepath), { recursive: true });
  await sharp(buffer).resize({ width: 1200 }).webp({ quality: 80 }).toFile(filepath);

  const coverUrl = `/uploads/${filename}`;

  // ✅ Mise à jour en base
  await prisma.utilisateur.update({
    where: { id: user.id },
    data: { coverUrl }
  });

  return NextResponse.json({ success: true, coverUrl });
}
