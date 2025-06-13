import { prisma } from "../../../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_, { params }) {
  const utilisateurId = parseInt(params.id);

  const acces = await prisma.demandeAcces.findMany({
    where: {
      proprietaireId: utilisateurId,
      statut: "ACCEPTEE",
    },
    include: {
      demandeur: {
        select: { id: true, pseudo: true, photoUrl: true },
      },
    },
  });

  return NextResponse.json(acces);
}
