// app/api/profils/[id]/route.js
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "../../../../lib/prisma";
import { getUserFromToken as getUserFromCookie } from "../../../../lib/auth";

const JWT_SECRET = process.env.JWT_SECRET;

async function getAuthUser(req) {
  const auth = req.headers.get("authorization") || "";
  if (auth.startsWith("Bearer ")) {
    const token = auth.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const user = await prisma.utilisateur.findUnique({
        where: { id: Number(payload.id) },
        select: { id: true },
      });
      if (user) return user;
    } catch {}
  }
  try {
    const user = await getUserFromCookie();
    if (user) return user;
  } catch {}
  return null;
}

export async function GET(req, { params }) {
  try {
    const me = await getAuthUser(req);
    if (!me) {
      return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
    }

    const id = Number(params.id);
    if (!id) {
      return NextResponse.json({ message: "Id invalide" }, { status: 400 });
    }

    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id },
      select: {
        id: true,
        pseudo: true,
        photoUrl: true,
        age: true,
        localisation: true,
        statut: true,
        type: true,
        verificationIdentiteStatut: true,
        // ajoute ici d'autres champs de détail si tu veux
      },
    });

    if (!utilisateur) {
      return NextResponse.json({ message: "Introuvable" }, { status: 404 });
    }

    return NextResponse.json(utilisateur);
  } catch (err) {
    console.error("❌ GET /api/profils/[id] :", err);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}
