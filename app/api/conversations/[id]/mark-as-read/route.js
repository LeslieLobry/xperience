// app/api/conversations/[id]/mark-as-read/route.js
import { prisma } from "../../../../../lib/prisma";
import { NextResponse } from "next/server";

// POST /api/conversations/{conversationId}/mark-as-read
export async function POST(req, { params }) {
  const conversationId = parseInt(params.id, 10);
  const { userId } = await req.json();

  if (!conversationId || !userId) {
    return NextResponse.json(
      { error: "conversationId et userId requis" },
      { status: 400 }
    );
  }

  // Met à jour lastReadAt pour ce participant
  const result = await prisma.participant.updateMany({
    where: {
      conversationId: conversationId,
      utilisateurId: userId,
    },
    data: {
      lastReadAt: new Date(),
    },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "Participant introuvable" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
