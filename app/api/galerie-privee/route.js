import { prisma } from "../../../lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs"; // 🔐 Pour hasher le code

export async function POST(req) {
  try {
    const body = await req.json();
    const { nom, codeAcces, utilisateurId } = body;

    // ✅ Vérification des champs obligatoires
    if (!nom || !codeAcces || !utilisateurId) {
      return NextResponse.json(
        { error: "Données manquantes." },
        { status: 400 }
      );
    }

    // 🔍 Vérifie s’il existe déjà une galerie pour cet utilisateur
    const existing = await prisma.galeriePrivee.findFirst({
      where: { utilisateurId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Une galerie privée existe déjà pour cet utilisateur." },
        { status: 400 }
      );
    }

    // 🔐 Hash du code d'accès
    const hashedCode = await bcrypt.hash(codeAcces, 10);

    // ✅ Création de la galerie avec code hashé
    const galerie = await prisma.galeriePrivee.create({
      data: {
        nom,
        codeAcces: hashedCode,
        utilisateurId,
      },
    });

    return NextResponse.json(galerie, { status: 201 });

  } catch (err) {
    console.error("Erreur création galerie privée:", err);
    return NextResponse.json(
      { error: "Erreur serveur lors de la création." },
      { status: 500 }
    );
  }
}
