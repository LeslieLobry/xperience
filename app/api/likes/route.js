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

    // ✅ Ajout dans le digest (au lieu de notification immédiate)
    await prisma.digestNotification.create({
      data: {
        destinataireId: Number(cibleId), // celui qui reçoit le like
        auteurId: user.id,               // celui qui like
        likeId: like.id,
      },
    });

    return NextResponse.json(like);
  } catch (err) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "Like déjà existant" }, { status: 400 });
    }
    console.error("Erreur création like ou digest :", err);
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

  // ❌ On ne supprime pas le digest (il sera envoyé même si le like est retiré)
  // Mais tu pourrais ajouter une logique pour nettoyer si tu préfères

  return NextResponse.json({ success: true });
}
