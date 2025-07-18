import { prisma } from "../../../lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromToken } from "../../../lib/auth";
import { getIdsUtilisateursExclus } from "../../../lib/utilsFiltrage";

// POST /api/conversations
export async function POST(req) {
  try {
    const currentUser = await getUserFromToken();
    if (!currentUser) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const { participantIds } = await req.json();

    if (!Array.isArray(participantIds) || participantIds.length < 2) {
      return NextResponse.json({ error: "Participants invalides" }, { status: 400 });
    }
    if (!participantIds.includes(currentUser.id)) {
      return NextResponse.json({ error: "Tu dois faire partie des participants." }, { status: 403 });
    }
    const exclus = await getIdsUtilisateursExclus(currentUser.id);
    const autres = participantIds.filter((id) => id !== currentUser.id);

    if (autres.some((id) => exclus.includes(id))) {
      return NextResponse.json(
        { error: "Impossible de créer une conversation avec un utilisateur bloqué." },
        { status: 403 }
      );
    }

    const conversationsPotentielles = await prisma.conversation.findMany({
      where: {
        participants: {
          some: { utilisateurId: currentUser.id },
        },
      },
      include: {
        participants: true,
      },
    });

    const inputIdsSorted = [...participantIds].sort();
    const existingConversation = conversationsPotentielles.find((conv) => {
      const idsSorted = conv.participants.map((p) => p.utilisateurId).sort();
      return JSON.stringify(idsSorted) === JSON.stringify(inputIdsSorted);
    });
if (existingConversation) {
  // Vérifie si currentUser a supprimé sa participation (soft delete)
  const myParticipant = existingConversation.participants.find(
    (p) => p.utilisateurId === currentUser.id
  );
  if (myParticipant && myParticipant.supprimé) {
    // On restaure ce participant !
    await prisma.participant.update({
      where: { id: myParticipant.id },
      data: { supprimé: false },
    });
    // Recharge la conv à jour (participants et messages)
    const restoredConv = await prisma.conversation.findUnique({
      where: { id: existingConversation.id },
      include: {
        participants: {
          include: {
            utilisateur: { select: { id: true, pseudo: true, photoUrl: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            contenu: true,
            type: true,
            createdAt: true,
            auteurId: true,
            lu: true,
          },
        },
      },
    });
    return NextResponse.json({ conversation: restoredConv, existed: true, restored: true });
  }
  // Sinon, conv déjà active
  return NextResponse.json({ conversation: existingConversation, existed: true });
}

    const conversation = await prisma.conversation.create({
      data: {
        participants: {
          create: participantIds.map((id) => ({ utilisateurId: id })),
        },
      },
      include: {
        participants: {
          include: {
            utilisateur: {
              select: { id: true, pseudo: true, photoUrl: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ conversation, created: true });
  } catch (err) {
    console.error("❌ Erreur POST /api/conversations :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// GET /api/conversations — avec unreadCount
export async function GET() {
  try {
    const currentUser = await getUserFromToken();
    if (!currentUser) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = currentUser.id;
    const exclus = await getIdsUtilisateursExclus(userId);

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: { utilisateurId: userId ,
                 supprimé: false,
          },
        },
      },
      include: {
        participants: {
          include: {
            utilisateur: {
              select: { id: true, pseudo: true, photoUrl: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1, 
          select: {
            id: true,
            contenu: true,
            type: true,
            createdAt: true,
            auteurId: true,
            lu: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const formatted = await Promise.all(conversations
      .filter((conv) => conv.participants.every((p) => !exclus.includes(p.utilisateurId)))
      .map(async (conv) => {
       
        const myParticipant = conv.participants.find(p => p.utilisateurId === userId);

        let unreadCount = 0;
        if (myParticipant) {
          unreadCount = await prisma.message.count({
            where: {
              conversationId: conv.id,
              auteurId: { not: userId },
              createdAt: {
                gt: myParticipant.lastReadAt || new Date(0)
              },
            },
          });
        }

        return {
          ...conv,
          unreadCount,
          messages: conv.messages, 
        };
      })
    );

    return NextResponse.json({ conversations: formatted });
  } catch (err) {
    console.error("❌ Erreur GET /api/conversations :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
