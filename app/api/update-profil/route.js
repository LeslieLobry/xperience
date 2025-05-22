import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { headers } from 'next/headers';

const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET;

export async function POST(req) {
  const cookieHeader = (await headers()).get('cookie') || '';
  const token = cookieHeader
    .split('; ')
    .find(row => row.startsWith('token='))
    ?.split('=')[1];

  if (!token) {
    return NextResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Token invalide.' }, { status: 403 });
  }

  const body = await req.json();

  try {
    await prisma.utilisateur.update({
      where: { id: decoded.id },
      data: {
        localisation: body.localisation,
        experience: body.experience,
        rechercheType: body.rechercheType,
        sexe: body.sexe,
        age: Number(body.age),
        fumeur: body.fumeur,
        silhouette: body.silhouette,
        taille: body.taille,
        origines: body.origines,
        yeux: body.yeux,
        cheveux: body.cheveux
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erreur update-profil :", err);
    return NextResponse.json({ success: false, message: 'Erreur serveur.' }, { status: 500 });
  }
}
