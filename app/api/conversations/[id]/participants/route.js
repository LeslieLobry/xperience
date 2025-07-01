// /app/api/conversations/[id]/participants/route.js
import { prisma } from "../../../../../lib/prisma";
import { getUserFromToken } from "../../../../../lib/auth";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  const conversationId = parseInt(params.id, 10);
  const user = await getUserFromToken();

  if (!user) {
    return NextResponse.json({ success: false, error: "Non authentifié" }, { status: 401 });
  }

  try {
    // Vérifie que l'utilisateur participe à cette conversation
    const participant = await prisma.participant.findFirst({
      where: {
        conversationId,
        utilisateurId: user.id,
      },
    });

    if (!participant) {
      return NextResponse.json({ success: false, error: "Accès interdit" }, { status: 403 });
    }

    // Récupère tous les participants
    const participants = await prisma.participant.findMany({
      where: { conversationId },
      include: {
        utilisateur: {
          select: {
            id: true,
            pseudo: true,
            photoUrl: true,
          },
        },
      },
    });

    const formatted = participants.map((p) => ({
      id: p.utilisateur.id,
      pseudo: p.utilisateur.pseudo,
      photoUrl: p.utilisateur.photoUrl,
      lastReadAt: p.lastReadAt,
    }));

    return NextResponse.json({ success: true, participants: formatted });
  } catch (error) {
    console.error("❌ Erreur API participants :", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}
