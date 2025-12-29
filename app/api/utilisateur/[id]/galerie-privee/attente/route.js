// /app/api/utilisateur/[id]/galerie-privee/attente/route.js
import { prisma } from "../../../../../../lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  try {
    const utilisateurId = parseInt(params.id, 10);
    if (!utilisateurId) {
      return NextResponse.json({ error: "ID utilisateur manquant" }, { status: 400 });
    }

    // ✅ DEBUG: counts
    const totalOwner = await prisma.demandeAcces.count({
      where: { proprietaireId: utilisateurId },
    });

    const totalAttente = await prisma.demandeAcces.count({
      where: { proprietaireId: utilisateurId, statut: "EN_ATTENTE" },
    });

    // ✅ DEBUG: sample sans filtre statut
    const sample = await prisma.demandeAcces.findMany({
      where: { proprietaireId: utilisateurId },
      take: 5,
      orderBy: { id: "desc" },
      select: { id: true, statut: true, proprietaireId: true, demandeurId: true, galeriePriveeId: true },
    });

    // ✅ Résultat normal (ce que ton front consomme)
    const attente = await prisma.demandeAcces.findMany({
      where: { proprietaireId: utilisateurId, statut: "EN_ATTENTE" },
      include: { demandeur: { select: { id: true, pseudo: true, photoUrl: true } } },
      orderBy: { id: "desc" },
    });

    return NextResponse.json({
      debug: {
        utilisateurId,
        totalOwner,
        totalAttente,
        sample,
        databaseHint: process.env.DATABASE_URL ? process.env.DATABASE_URL.slice(0, 35) + "..." : null,
      },
      attente,
    });
  } catch (e) {
    console.error("💥 Erreur attente DEBUG:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
