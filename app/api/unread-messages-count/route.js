
import { prisma } from "../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const userIdParam = searchParams.get("userId");
  const userId = userIdParam ? parseInt(userIdParam, 10) : null;

  if (!userId) {
    return NextResponse.json(
      { error: "Paramètre userId requis" },
      { status: 400 }
    );
  }

  // Récupère toutes les participations de l'utilisateur
  const participantEntries = await prisma.participant.findMany({
    where: { utilisateurId: userId },
    select: {
      conversationId: true,
      lastReadAt: true,
    },
  });

  if (participantEntries.length === 0) {
    // Aucune conversation → aucun message non lu
    return NextResponse.json({ unreadCount: 0 });
  }

  let totalUnread = 0;

  // Pour chaque conversation, compte les messages postérieurs à lastReadAt
  for (const { conversationId, lastReadAt } of participantEntries) {
    const cutoff = lastReadAt || new Date(0);

    const countInConv = await prisma.message.count({
      where: {
        conversationId: conversationId,
        auteurId: { not: userId },
        createdAt: { gt: cutoff },
      },
    });

    totalUnread += countInConv;
  }

  return NextResponse.json({ unreadCount: totalUnread });
}
