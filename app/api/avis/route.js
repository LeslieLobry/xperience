import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET;

export async function POST(req) {
  const body = await req.json();

  const cookieStore = await cookies(); // ✅ ATTENTION : await ici
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let payload;
  try {
    payload = jwt.verify(token, secret);
    if (!payload || typeof payload !== "object" || !payload.id) {
      throw new Error("Token invalide");
    }
  } catch (err) {
    return NextResponse.json({ error: "Token invalide" }, { status: 403 });
  }

  const auteurId = parseInt(payload.id);
  const { cibleId, commentaire } = body;

  if (!cibleId || !commentaire) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  if (auteurId === parseInt(cibleId)) {
    return NextResponse.json({ error: "Vous ne pouvez pas laisser un avis sur vous-même." }, { status: 400 });
  }

  // Vérifie si un avis existe déjà pour ce couple
  const existing = await prisma.avis.findUnique({
    where: {
      auteurId_cibleId: {
        auteurId,
        cibleId: parseInt(cibleId),
      },
    },
  });

  if (existing) {
    return NextResponse.json({ error: "Vous avez déjà laissé un avis." }, { status: 400 });
  }

  try {
    const avis = await prisma.avis.create({
      data: {
        auteurId,
        cibleId: parseInt(cibleId),
        commentaire,
      },
    });

    return NextResponse.json({ success: true, avis });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de l'enregistrement." }, { status: 500 });
  }
}
