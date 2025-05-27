import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "../../../../lib/prisma";

const secret = process.env.JWT_SECRET;

export async function GET() {
  const token = cookies().get("token")?.value;

  if (!token || !secret) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return NextResponse.json({ error: "Token invalide" }, { status: 403 });
  }

  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id: decoded.id },
    select: {
      id: true,
      pseudo: true,
      role: true,
      emailVerified: true,
    },
  });

  if (!utilisateur) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  return NextResponse.json({ utilisateur });
}

// ✅ AJOUTE CETTE PARTIE POUR ACCEPTER LE POST

export async function POST(req) {
  const token = cookies().get("token")?.value;

  if (!token || !secret) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return NextResponse.json({ error: "Token invalide" }, { status: 403 });
  }

  const body = await req.json();
  const { statut } = body;

  if (!["en_ligne", "hors_ligne"].includes(statut)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  await prisma.utilisateur.update({
    where: { id: decoded.id },
    data: { statut },
  });

  return NextResponse.json({ success: true, statut });
}
