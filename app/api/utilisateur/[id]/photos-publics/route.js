import { prisma } from "../../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_, { params }) {
  const utilisateurId = parseInt(params.id, 10);

  if (!utilisateurId || isNaN(utilisateurId)) {
    return NextResponse.json({ error: "ID utilisateur invalide" }, { status: 400 });
  }

  try {
    const photos = await prisma.photo.findMany({
      where: {
        utilisateurId,
        galeriePriveeId: null, // 🟢 Seulement les photos publiques
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(photos);
  } catch (err) {
    console.error("Erreur récupération photos publiques:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
