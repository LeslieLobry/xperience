import { prisma } from "../../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  const utilisateurId = parseInt(params.id);
  const { searchParams } = new URL(req.url);
  const visiteurId = parseInt(searchParams.get("visiteurId"));

  if (!utilisateurId || !visiteurId) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const galerie = await prisma.galeriePrivee.findUnique({
    where: { utilisateurId },
  });

  if (!galerie) {
    return NextResponse.json({ error: "Galerie non trouvée" }, { status: 404 });
  }

  // Si le visiteur est le propriétaire, accès direct
  if (utilisateurId === visiteurId) {
    const photos = await prisma.photo.findMany({
      where: { galeriePriveeId: galerie.id },
      select: { id: true, url: true },
    });
    return NextResponse.json({ access: "granted", photos });
  }

  const demande = await prisma.demandeAcces.findUnique({
    where: {
      galeriePriveeId_demandeurId: {
        galeriePriveeId: galerie.id,
        demandeurId: visiteurId,
      },
    },
  });

  if (!demande) {
    return NextResponse.json({ access: "none" }, { status: 200 });
  }

  if (demande.statut === "REFUSEE") {
    return NextResponse.json({ access: "refused" }, { status: 200 });
  }

  if (demande.statut === "EN_ATTENTE") {
    return NextResponse.json({ access: "pending" }, { status: 200 });
  }

  // Si accepté
  const photos = await prisma.photo.findMany({
    where: { galeriePriveeId: galerie.id },
    select: { id: true, url: true },
  });

  return NextResponse.json({ access: "granted", photos });
}
