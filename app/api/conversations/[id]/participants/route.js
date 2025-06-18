// /app/api/conversations/[id]/participants/route.js
import { prisma } from "../../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  const conversationId = parseInt(params.id, 10);

  try {
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
