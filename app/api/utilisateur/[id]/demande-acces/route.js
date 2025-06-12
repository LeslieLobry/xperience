import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req, { params }) {
  const proprietaireId = parseInt(params.id); // utilisateur à qui appartient la galerie
  const { visiteurId } = await req.json();

  if (!proprietaireId || isNaN(proprietaireId) || !visiteurId || isNaN(visiteurId)) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }

  if (proprietaireId === visiteurId) {
    return NextResponse.json({ error: "Impossible de demander accès à sa propre galerie" }, { status: 400 });
  }

  // Vérifie que la galerie existe
  const galerie = await prisma.galeriePrivee.findUnique({
    where: { utilisateurId: proprietaireId },
  });

  if (!galerie) {
    return NextResponse.json({ error: "Galerie introuvable" }, { status: 404 });
  }

  // Vérifie si une demande existe déjà
  const existing = await prisma.demandeAcces.findUnique({
    where: {
      galeriePriveeId_demandeurId: {
        galeriePriveeId: galerie.id,
        demandeurId: visiteurId,
      },
    },
  });

  if (existing) {
    return NextResponse.json({ error: "Demande déjà existante" }, { status: 409 });
  }

  // Crée la demande
  const nouvelleDemande = await prisma.demandeAcces.create({
    data: {
      galeriePriveeId: galerie.id,
      demandeurId: visiteurId,
      proprietaireId: proprietaireId,
      statut: "EN_ATTENTE",
    },
  });

  return NextResponse.json(nouvelleDemande, { status: 201 });
}
