import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET;

async function getUserFromToken() {
  const cookieStore = cookies();
  const allCookies = await cookieStore;
  const token = allCookies.get("token")?.value;
  if (!token || !JWT_SECRET) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function POST(req) {
  const body = await req.json();
  const { cibleId } = body;
  if (!cibleId || isNaN(cibleId)) {
    return NextResponse.json({ error: "cibleId manquant ou invalide" }, { status: 400 });
  }

  const user = await getUserFromToken();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    // Création du like
    const like = await prisma.like.create({
      data: {
        auteurId: user.id,
        cibleId: Number(cibleId),
      },
    });

    // Création de la notification liée au like
    await prisma.notification.create({
      data: {
        utilisateurId: Number(cibleId), // destinataire de la notif = cible du like
        message: `${user.pseudo} a aimé votre profil`,
        lien: `/profil/${user.id}`, // lien vers le profil de celui qui like
        lu: false,
      },
    });

    return NextResponse.json(like);
  } catch (err) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "Like déjà existant" }, { status: 400 });
    }
    console.error("Erreur création like ou notif :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req) {
  const body = await req.json();
  const { cibleId } = body;
  const user = await getUserFromToken();

  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // Suppression du like
  await prisma.like.deleteMany({
    where: {
      auteurId: user.id,
      cibleId: Number(cibleId),
    },
  });

  // Suppression éventuelle de la notification liée au like
  await prisma.notification.deleteMany({
    where: {
      utilisateurId: Number(cibleId),
      message: {
        contains: `${user.pseudo} a aimé`,
      },
      // Optionnel : tu peux ajouter un filtre sur le lien ou date si tu veux plus de précision
    },
  });

  return NextResponse.json({ success: true });
}
