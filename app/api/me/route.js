import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers"; // <-- AJOUTER ça
import { NextResponse } from "next/server"; // <-- pour Response.json()

const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET;

export async function GET() {
  const cookieStore = cookies(); // <-- CORRECTION ici
  const token = cookieStore.get("token")?.value; // <-- et ici

  if (!token) {
    return NextResponse.json({ success: false, message: "Non authentifié." }, { status: 401 });
  }

  try {
    const decoded = jwt.verify(token, secret);

    const user = await prisma.utilisateur.findUnique({
      where: { id: decoded.id },
      include: { recherches: true, envies: true }, // Ajout si tu veux aussi les envies
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "Utilisateur introuvable." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        pseudo: user.pseudo,
        photoUrl: user.photoUrl,
        recherches: user.recherches,
        envies: user.envies,
      },
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: "Token invalide." }, { status: 403 });
  }
}
