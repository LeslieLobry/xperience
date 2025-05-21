import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { getUserFromToken } from '@/lib/auth';

export async function POST(req) {
  const cookieStore = cookies();
  const user = getUserFromToken(cookieStore);

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('image');

  if (!file || typeof file === 'string') {
    return NextResponse.json({ success: false, message: 'Fichier invalide' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const filename = `event_${Date.now()}.webp`;
  const filepath = path.join(process.cwd(), 'public/uploads', filename);

  await fs.mkdir(path.dirname(filepath), { recursive: true });
  await sharp(buffer).resize(800).webp({ quality: 80 }).toFile(filepath);

  const imageUrl = `/uploads/${filename}`;
  return NextResponse.json({ success: true, imageUrl });
}
