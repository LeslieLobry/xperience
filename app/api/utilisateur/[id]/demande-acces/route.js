import { prisma } from "../../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const url = new URL(req.url);
    const utilisateurId = parseInt(url.pathname.split("/")[3]); // récupère l'ID de l'URL

    const { visiteurId } = await req.json();
    console.log("🔍 Reçu :", { visiteurId, utilisateurId });

    if (!utilisateurId || !visiteurId) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    const galerie = await prisma.galeriePrivee.findUnique({
      where: { utilisateurId },
    });

    if (!galerie) {
      return NextResponse.json({ error: "Galerie non trouvée" }, { status: 404 });
    }

    const existing = await prisma.demandeAcces.findUnique({
      where: {
        galeriePriveeId_demandeurId: {
          galeriePriveeId: galerie.id,
          demandeurId: visiteurId,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ message: "Demande déjà existante" }, { status: 200 });
    }

    const demande = await prisma.demandeAcces.create({
      data: {
        galeriePriveeId: galerie.id,
        demandeurId: visiteurId,
        proprietaireId: utilisateurId,
        statut: "EN_ATTENTE",
      },
    });
await prisma.notification.create({
  data: {
    utilisateurId: utilisateurId, // le propriétaire
    message: `Nouvelle demande d'accès à votre galerie privée`,
    lien: `/profil/${visiteurId}`,
  },
});

    return NextResponse.json(demande);
  } catch (error) {
    console.error("💥 Erreur dans demande d'accès :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
