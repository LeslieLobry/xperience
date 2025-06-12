import { prisma } from "../../../lib/prisma";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserFromToken } from "../../../lib/auth";
import { getIdsUtilisateursExclus } from "../../../lib/utilsFiltrage";

// POST /api/conversations
export async function POST(req) {
  try {
    const cookieStore = cookies();
    const currentUser = await getUserFromToken(cookieStore);

    if (!currentUser) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { participantIds } = body;

    if (!Array.isArray(participantIds) || participantIds.length < 2) {
      return NextResponse.json({ error: "Participants invalides" }, { status: 400 });
    }

    if (!participantIds.includes(currentUser.id)) {
      return NextResponse.json({ error: "Tu dois faire partie des participants." }, { status: 403 });
    }

    // Vérifie les utilisateurs exclus (bloqués ou bloquants)
    const exclus = await getIdsUtilisateursExclus(currentUser.id);
    const autres = participantIds.filter((id) => id !== currentUser.id);

    const estBloque = autres.some((id) => exclus.includes(id));
    if (estBloque) {
      return NextResponse.json(
        { error: "Impossible de créer une conversation avec un utilisateur bloqué." },
        { status: 403 }
      );
    }

    // Vérifie si une conversation existe déjà
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

    // Crée la conversation
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
  } catch (err) {
    console.error("❌ Erreur POST /api/conversations :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// GET /api/conversations?userId=xxx
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get("userId");
    const userId = userIdParam ? parseInt(userIdParam, 10) : null;

    if (!userId || isNaN(userId)) {
      return NextResponse.json({ error: "Paramètre userId requis ou invalide" }, { status: 400 });
    }

    // Filtrer les conversations avec utilisateurs exclus
    const exclus = await getIdsUtilisateursExclus(userId);

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

    // Filtrer côté serveur pour retirer celles avec utilisateurs exclus
    const conversationsFiltrees = conversations.filter((conv) =>
      conv.participants.every((p) => !exclus.includes(p.utilisateurId))
    );

    return NextResponse.json({ conversations: conversationsFiltrees });
  } catch (err) {
    console.error("❌ Erreur GET /api/conversations :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
