import { prisma } from "../../../..../../../../lib/prisma";
import { getUserFromToken } from "../../../../lib/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = cookies();
  const user = await getUserFromToken(cookieStore);

  if (!user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const demandes = await prisma.demandeAcces.findMany({
    where: {
      galeriePrivee: { utilisateurId: user.id },
      statut: "EN_ATTENTE",
    },
    include: {
      demandeur: {
        select: { id: true, pseudo: true, photoUrl: true },
      },
    },
  });

  return NextResponse.json(demandes);
}
