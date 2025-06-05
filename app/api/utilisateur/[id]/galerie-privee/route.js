import { prisma } from "../../../../../lib/prisma";
import { NextResponse } from "next/server";

// GET /api/utilisateurs/[id]/galerie-privee
export async function GET(_, { params }) {
  const utilisateurId = Number(params.id);

  if (!utilisateurId || isNaN(utilisateurId)) {
    return NextResponse.json({ error: "ID utilisateur invalide" }, { status: 400 });
  }

  const galerie = await prisma.galeriePrivee.findUnique({
    where: { utilisateurId },
    select: {
      id: true,
      nom: true,
      utilisateurId: true,
    },
  });

  if (!galerie) {
    return NextResponse.json({ error: "Aucune galerie privée trouvée" }, { status: 404 });
  }

  return NextResponse.json(galerie, { status: 200 });
}
