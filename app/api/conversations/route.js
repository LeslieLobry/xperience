import { prisma } from "../../../lib/prisma";
import { NextResponse } from "next/server";

// POST /api/conversations
export async function POST(req) {
  const body = await req.json();
  const { participantIds } = body;

  if (!Array.isArray(participantIds) || participantIds.length < 2) {
    return NextResponse.json({ error: "Participants invalides" }, { status: 400 });
  }

  // Vérifie si une conversation existe déjà entre ces participants
  const existingConversation = await prisma.conversation.findFirst({
    where: {
      participants: {
        every: {
          utilisateurId: { in: participantIds },
        },
      },
    },
    include: {
      participants: true,
    },
  });

  if (existingConversation) {
    return NextResponse.json({ conversation: existingConversation, existed: true });
  }

  // Crée une nouvelle conversation
  const conversation = await prisma.conversation.create({
    data: {
      participants: {
        create: participantIds.map((id) => ({ utilisateurId: id })),
      },
    },
    include: {
      participants: { include: { utilisateur: true } },
    },
  });

  return NextResponse.json({ conversation, created: true });
}

// GET /api/conversations?userId=xxx
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const userIdParam = searchParams.get("userId");
  const userId = userIdParam ? parseInt(userIdParam, 10) : null;

  if (!userId || isNaN(userId)) {
    return NextResponse.json(
      { error: "Paramètre userId requis ou invalide" },
      { status: 400 }
    );
  }

  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            utilisateurId: userId,
          },
        },
      },
      include: {
        participants: { include: { utilisateur: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json({ conversations });
  } catch (err) {
    console.error("❌ Erreur serveur dans /api/conversations :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
