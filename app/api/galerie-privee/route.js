import { prisma } from "../../../lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromToken } from "../../../lib/auth"; // adapte le chemin à ton projet

export async function POST(req) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { nom } = body; // optionnel

    // 🔍 Cherche si une galerie existe déjà pour cet utilisateur
    let galerie = await prisma.galeriePrivee.findFirst({
      where: { utilisateurId: user.id },
    });

    if (!galerie) {
      // ✅ Création si elle n'existe pas encore
      galerie = await prisma.galeriePrivee.create({
        data: {
          nom: nom || "Galerie privée",
          utilisateurId: user.id,
          // si ton modèle a encore `codeAcces` en optionnel :
          // codeAcces: null,
        },
      });
    }

    // 🔁 On renvoie toujours la galerie (existante ou nouvellement créée)
    return NextResponse.json(galerie, { status: 200 });
  } catch (err) {
    console.error("Erreur création/recup galerie privée:", err);
    return NextResponse.json(
      { error: "Erreur serveur lors de la création de la galerie." },
      { status: 500 }
    );
  }
}
