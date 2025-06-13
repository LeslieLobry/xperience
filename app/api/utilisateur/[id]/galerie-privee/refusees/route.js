// /app/api/utilisateur/[id]/galerie-privee/refusees/route.js

import { prisma } from "../../../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_, { params }) {
  const utilisateurId = parseInt(params.id);

  if (!utilisateurId) {
    return NextResponse.json({ error: "ID utilisateur manquant" }, { status: 400 });
  }

  const refus = await prisma.demandeAcces.findMany({
    where: {
      proprietaireId: utilisateurId,
      statut: "REFUSEE",
    },
    include: {
      demandeur: {
        select: { id: true, pseudo: true, photoUrl: true },
      },
    },
  });

  return NextResponse.json(refus);
}
