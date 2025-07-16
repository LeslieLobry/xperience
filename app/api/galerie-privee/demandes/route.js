import { prisma } from "../../../../lib/prisma";
import { getUserFromToken } from "../../../../lib/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = cookies();
  const user = await getUserFromToken(cookieStore);

  if (!user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // On vérifie si l'utilisateur a une galerie privée
  const galeriePrivee = await prisma.galeriePrivee.findUnique({
    where: { utilisateurId: user.id },
    select: { id: true }
  });

  if (!galeriePrivee) {
    // Nouveau: flag spécial pour le frontend
    return NextResponse.json({ error: "NO_GALERIE" }, { status: 200 });
  }

  // On récupère les demandes si la galerie existe
  const demandes = await prisma.demandeAcces.findMany({
    where: {
      galeriePriveeId: galeriePrivee.id,
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
