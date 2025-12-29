// /app/api/utilisateur/[id]/galerie-privee/attente/route.js

import { prisma } from "../../../../../../lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromToken } from "../../../../../../lib/auth";

export const runtime = "nodejs";

export async function GET(_, { params }) {
  try {
    const connectedUser = await getUserFromToken();
    if (!connectedUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const utilisateurId = parseInt(params.id, 10);
    if (!utilisateurId) {
      return NextResponse.json({ error: "ID utilisateur manquant" }, { status: 400 });
    }

    if (Number(connectedUser.id) !== Number(utilisateurId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const attente = await prisma.demandeAcces.findMany({
      where: {
        proprietaireId: utilisateurId,
        statut: "EN_ATTENTE",
      },
      orderBy: { id: "desc" },
      include: {
        demandeur: {
          select: { id: true, pseudo: true, photoUrl: true },
        },
      },
    });

    return NextResponse.json(attente);
  } catch (e) {
    console.error("💥 Erreur attente:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
