// /app/api/utilisateur/[id]/galerie-privee/attente/route.js
import { prisma } from "../../../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_, { params }) {
  const utilisateurId = parseInt(params.id, 10);

  if (!utilisateurId) {
    return NextResponse.json({ error: "ID utilisateur manquant" }, { status: 400 });
  }

  const attente = await prisma.demandeAcces.findMany({
    where: {
      proprietaireId: utilisateurId,
      statut: "EN_ATTENTE",
    },
    include: {
      demandeur: {
        select: { id: true, pseudo: true, photoUrl: true },
      },
    },
    orderBy: { id: "desc" },
  });

  return NextResponse.json(attente);
}
