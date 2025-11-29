import { prisma } from "../../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  try {
    const utilisateurId = Number.parseInt(params.id, 10);
    const { searchParams } = new URL(req.url);
    const visiteurIdRaw = searchParams.get("visiteurId");
    const visiteurId = visiteurIdRaw ? Number.parseInt(visiteurIdRaw, 10) : null;

    if (Number.isNaN(utilisateurId)) {
      return NextResponse.json(
        { error: "Paramètre utilisateur invalide" },
        { status: 400 }
      );
    }

    let galerie = await prisma.galeriePrivee.findUnique({
      where: { utilisateurId },
      include: { photos: { select: { id: true, url: true } } },
    });

    // 🔹 1) PAS DE GALERIE
    if (!galerie) {
      // → si c'est le propriétaire qui regarde, on la crée automatiquement
      if (visiteurId && visiteurId === utilisateurId) {
        galerie = await prisma.galeriePrivee.create({
          data: {
            utilisateurId,
            nom: "Galerie privée",
          },
          include: { photos: { select: { id: true, url: true } } },
        });

        return NextResponse.json(
          {
            access: "granted",
            photos: galerie.photos,
            galerieId: galerie.id,
          },
          { status: 200 }
        );
      }

      // → sinon, simple "none"
      return NextResponse.json(
        { access: "none", photos: [], galerieId: null },
        { status: 200 }
      );
    }

    // 🔹 2) GALERIE EXISTANTE — propriétaire
    if (visiteurId && visiteurId === utilisateurId) {
      return NextResponse.json(
        {
          access: "granted",
          photos: galerie.photos,
          galerieId: galerie.id,
        },
        { status: 200 }
      );
    }

    // 🔹 3) GALERIE EXISTANTE — visiteur ≠ propriétaire : on vérifie la demande d'accès
    const demande = visiteurId
      ? await prisma.demandeAcces.findUnique({
          where: {
            galeriePriveeId_demandeurId: {
              galeriePriveeId: galerie.id,
              demandeurId: visiteurId,
            },
          },
        })
      : null;

    if (!demande) {
      return NextResponse.json(
        { access: "none", photos: [], galerieId: galerie.id },
        { status: 200 }
      );
    }

    if (demande.statut === "REFUSEE") {
      return NextResponse.json(
        { access: "refused", photos: [], galerieId: galerie.id },
        { status: 200 }
      );
    }

    if (demande.statut === "EN_ATTENTE") {
      return NextResponse.json(
        { access: "pending", photos: [], galerieId: galerie.id },
        { status: 200 }
      );
    }

    // 🔹 4) DEMANDE ACCEPTÉE
    return NextResponse.json(
      { access: "granted", photos: galerie.photos, galerieId: galerie.id },
      { status: 200 }
    );
  } catch (err) {
    console.error("Erreur GET /utilisateur/[id]/galerie-privee :", err);
    return NextResponse.json(
      { access: "none", photos: [], galerieId: null },
      { status: 500 }
    );
  }
}
