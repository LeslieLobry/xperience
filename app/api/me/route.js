import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { use } from "react";

const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET;

export async function GET() {
  const headersList = await headers(); // ✅ ici on attend headers()
  const cookieHeader = headersList.get("cookie") || "";
  const token = cookieHeader
    .split("; ")
    .find(row => row.startsWith("token="))
    ?.split("=")[1];
console.log("📥 /api/me – Token reçu :", token);
  if (!token) {
    return NextResponse.json({ success: false, message: "Non authentifié." }, { status: 401 });
  }

  try {
    const decoded = jwt.verify(token, secret);

    const user = await prisma.utilisateur.findUnique({
      where: { id: decoded.id },
      include: { recherches: true, envies: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "Utilisateur introuvable." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        pseudo: user.pseudo,
        photoUrl: user.photoUrl,
        recherches: user.recherches,
        envies: user.envies,
        age: user.age,
        description: user.description,
        localisation: user.localisation,
        experience: user.experience,
        rechercheType: user.rechercheType,
        sexe: user.sexe,
        fumeur: user.fumeur,
        silhouette: user.silhouette,
        taille: user.taille,
        origines: user.origines,
        yeux: user.yeux,
        cheveux: user.cheveux,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (err) {
    console.error("❌ Erreur vérification JWT :", err.message);
    return NextResponse.json({ success: false, message: "Token invalide." }, { status: 403 });
  }
}
