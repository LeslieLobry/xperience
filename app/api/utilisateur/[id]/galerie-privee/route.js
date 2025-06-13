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
    include: { photos: { select: { id: true, url: true } } },
  });

  if (!galerie) {
    return NextResponse.json({ error: "Galerie non trouvée" }, { status: 404 });
  }

  // Si le visiteur est le propriétaire
  if (utilisateurId === visiteurId) {
    return NextResponse.json({ access: "granted", photos: galerie.photos });
  }

  const demande = await prisma.demandeAcces.findUnique({
    where: {
      galeriePriveeId_demandeurId: {
        galeriePriveeId: galerie.id,
        demandeurId: visiteurId,
      },
    },
  });

  if (!demande) return NextResponse.json({ access: "none" });
  if (demande.statut === "REFUSEE") return NextResponse.json({ access: "refused" });
  if (demande.statut === "EN_ATTENTE") return NextResponse.json({ access: "pending" });

  // Si accepté
  return NextResponse.json({ access: "granted", photos: galerie.photos });
}
