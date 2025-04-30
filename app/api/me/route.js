import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET;

export async function GET() {
  const cookieHeader = headers().get("cookie") || "";
  const token = cookieHeader
    .split("; ")
    .find(row => row.startsWith("token="))
    ?.split("=")[1];

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
        pseudo: user.pseudo,
        photoUrl: user.photoUrl,
        recherches: user.recherches,
        envies: user.envies,
        age: user.age,
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
      },
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: "Token invalide." }, { status: 403 });
  }
}
