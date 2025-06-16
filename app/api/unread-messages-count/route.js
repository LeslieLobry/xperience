import { prisma } from "../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const userIdParam = searchParams.get("userId"); // 👈 il manquait cette ligne
  const userId = userIdParam ? parseInt(userIdParam, 10) : null;

  if (!userId) {
    return NextResponse.json(
      { error: "Paramètre userId requis" },
      { status: 400 }
    );
  }

  try {
    const participantEntries = await prisma.Participant.findMany({
      where: { utilisateurId: userId },
      select: {
        conversationId: true,
        lastReadAt: true,
      },
    });

    if (participantEntries.length === 0) {
      return NextResponse.json({ unreadCount: 0 });
    }

    let totalUnread = 0;

    for (const { conversationId, lastReadAt } of participantEntries) {
      const cutoff = lastReadAt || new Date(0);

      const countInConv = await prisma.Message.count({
        where: {
          conversationId,
          auteurId: { not: userId },
          createdAt: { gt: cutoff },
        },
      });

      totalUnread += countInConv;
    }

    return NextResponse.json({ unreadCount: totalUnread });
  } catch (error) {
    console.error("❌ Erreur dans /api/unread-messages-count :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
