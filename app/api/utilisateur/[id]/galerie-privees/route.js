import { prisma } from "../../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  const utilisateurId = parseInt(params.id); // propriétaire
  const { searchParams } = new URL(req.url);
  const visiteurId = parseInt(searchParams.get("visiteurId"));

  if (!utilisateurId || isNaN(utilisateurId)) {
    return NextResponse.json({ error: "ID utilisateur invalide" }, { status: 400 });
  }

  if (!visiteurId || isNaN(visiteurId)) {
    return NextResponse.json({ error: "ID visiteur invalide" }, { status: 400 });
  }

  const galerie = await prisma.galeriePrivee.findUnique({
    where: { utilisateurId },
  });

  if (!galerie) {
    return NextResponse.json({ error: "Galerie introuvable" }, { status: 404 });
  }

  // Si le visiteur est aussi le proprio → accès direct
  if (visiteurId === utilisateurId) {
    const photos = await prisma.photo.findMany({
      where: { galeriePriveeId: galerie.id },
      select: { id: true, url: true },
    });
    return NextResponse.json(photos);
  }

  // Vérifier la demande d'accès
  const demande = await prisma.demandeAcces.findUnique({
    where: {
      galeriePriveeId_demandeurId: {
        galeriePriveeId: galerie.id,
        demandeurId: visiteurId,
      },
    },
  });

  if (!demande) {
    return NextResponse.json({ error: "Aucune demande trouvée" }, { status: 403 });
  }

  if (demande.statut === "REFUSEE") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  if (demande.statut === "EN_ATTENTE") {
    return NextResponse.json({ error: "Demande en attente" }, { status: 403 });
  }

  // Si ACCEPTEE
  const photos = await prisma.photo.findMany({
    where: { galeriePriveeId: galerie.id },
    select: { id: true, url: true },
  });

  return NextResponse.json(photos);
}
