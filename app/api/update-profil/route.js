import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { headers } from 'next/headers';
import { isProfilComplet } from '../../../lib/isProfilComplet'; 
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

  const champsCommun = {
    localisation: body.localisation,
    experience: body.experience,
    rechercheType: body.rechercheType,
    type: body.type,
    age: isNaN(Number(body.age)) ? null : Number(body.age),
    fumeur: body.fumeur,
    silhouette: body.silhouette,
    taille: isNaN(Number(body.taille)) ? null : Number(body.taille),
    origines: body.origines,
    yeux: body.yeux,
    cheveux: body.cheveux,
    description: body.description,
  };

  // Ajout des champs du second membre seulement si couple
  if (body.type?.trim().toLowerCase() === "couple") {
    champsCommun.age2 = isNaN(Number(body.age2)) ? null : Number(body.age2);
    champsCommun.dateNaissance2 = body.dateNaissance2 ? new Date(body.dateNaissance2) : null;
    champsCommun.fumeur2 = body.fumeur2;
    champsCommun.silhouette2 = body.silhouette2;
    champsCommun.taille2 = isNaN(Number(body.taille2)) ? null : Number(body.taille2);
    champsCommun.origines2 = body.origines2;
    champsCommun.yeux2 = body.yeux2;
    champsCommun.cheveux2 = body.cheveux2;
    champsCommun.description2 = body.description2;
  }
  console.log("TYPE reçu :", body.type, "Tous les champs :", body);

  // Nettoyage des champs
  const data = {};
  for (const key in champsCommun) {
    const value = champsCommun[key];
    if (
      value !== undefined &&
      value !== "" &&
      value !== null &&
      !(typeof value === "number" && isNaN(value))
    ) {
      data[key] = value;
    }
  }

  try {
    // 1. Met à jour l'utilisateur (profil)
    const updatedUser = await prisma.utilisateur.update({
      where: { id: decoded.id },
      data,
    });

    // 2. Calcule si le profil est complet (avec les nouvelles données)
    const profilComplet = isProfilComplet(updatedUser);

    // 3. Mets à jour le champ en base si besoin
    if (updatedUser.profilComplet !== profilComplet) {
      await prisma.utilisateur.update({
        where: { id: updatedUser.id },
        data: { profilComplet },
      });
    }

    // 4. Renvoie l'utilisateur à jour avec le bon flag
    return NextResponse.json({ success: true, user: { ...updatedUser, profilComplet } });

  } catch (err) {
    console.error("❌ Erreur update-profil :", err);
    return NextResponse.json({ success: false, message: 'Erreur serveur.' }, { status: 500 });
  }
}
