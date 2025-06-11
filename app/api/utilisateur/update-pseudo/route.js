import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export async function PATCH(req) {
  try {
    const token = cookies().get("token")?.value;

    if (!token || !JWT_SECRET) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { pseudo } = await req.json();

    if (!pseudo || pseudo.trim().length < 3) {
      return NextResponse.json({ error: "Pseudo invalide" }, { status: 400 });
    }

    const utilisateur = await prisma.utilisateur.update({
      where: { id: decoded.id },
      data: { pseudo },
    });

    return NextResponse.json({ success: true, utilisateur });
  } catch (err) {
    console.error("Erreur update pseudo", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}