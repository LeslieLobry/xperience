import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req, { params }) {
  const utilisateurId = parseInt(params.id);
  const { visiteurId } = await req.json();

  if (!utilisateurId || !visiteurId) {
    return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
  }

  // Récupère la galerie
  const galerie = await prisma.galeriePrivee.findUnique({
    where: { utilisateurId },
  });

  if (!galerie) {
    return NextResponse.json({ error: "Galerie non trouvée" }, { status: 404 });
  }

  // Vérifie s’il existe déjà une demande
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

  // Crée la demande
  const demande = await prisma.demandeAcces.create({
    data: {
      galeriePriveeId: galerie.id,
      demandeurId: visiteurId,
      statut: "EN_ATTENTE",
    },
  });

  return NextResponse.json(demande);
}
