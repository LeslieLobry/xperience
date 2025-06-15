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
  console.log("📥 Données reçues :", body);

  // Champs attendus
  const champs = {
    localisation: body.localisation,
    experience: body.experience,
    rechercheType: body.rechercheType,
    sexe: body.sexe,
    age: isNaN(Number(body.age)) ? null : Number(body.age),
    fumeur: body.fumeur,
    silhouette: body.silhouette,
    taille: isNaN(Number(body.taille)) ? null : Number(body.taille),
    origines: body.origines,
    yeux: body.yeux,
    cheveux: body.cheveux,
  };

  // Supprimer les champs vides ou undefined
  const data = {};
  for (const key in champs) {
    if (champs[key] !== undefined && champs[key] !== "") {
      data[key] = champs[key];
    }
  }

  try {
    await prisma.utilisateur.update({
      where: { id: decoded.id },
      data,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Erreur update-profil :", err);
    return NextResponse.json({ success: false, message: 'Erreur serveur.' }, { status: 500 });
  }
}
