// app/api/galeries-privees/route.js
import { prisma } from "../../../lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromToken } from "../../../lib/auth"; // adapte le chemin

export async function POST(req) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { nom } = body;

    // Cherche une galerie existante
    let galerie = await prisma.galeriePrivee.findFirst({
      where: { utilisateurId: user.id },
    });

    if (!galerie) {
      // Crée si elle n'existe pas
      galerie = await prisma.galeriePrivee.create({
        data: {
          nom: nom || "Galerie privée",
          utilisateurId: user.id,
          // codeAcces: null, // si ce champ existe encore et est optionnel
        },
      });
    }

    return NextResponse.json(galerie, { status: 200 });
  } catch (err) {
    console.error("Erreur création/recup galerie privée:", err);
    return NextResponse.json(
      { error: "Erreur serveur lors de la création de la galerie." },
      { status: 500 }
    );
  }
}
