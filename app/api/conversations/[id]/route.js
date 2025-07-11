import { NextResponse } from "next/server";
import { getUserFromToken } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

// GET /api/conversations/[id] — inutile si déjà dans /api/conversations
export async function GET(req) {
  const user = await getUserFromToken();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            utilisateurId: user.id,
            supprimé: false,
          },
        },
      },
      include: {
        participants: {
          where: { supprimé: false },
          select: {
            utilisateur: {
              select: {
                id: true,
                pseudo: true,
                photoUrl: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ success: true, conversations });
  } catch (err) {
    console.error("Erreur fetch conversations:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const user = await getUserFromToken();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const conversationId = parseInt(params?.id);
  if (!conversationId || isNaN(conversationId)) {
    return NextResponse.json({ error: "ID de conversation invalide" }, { status: 400 });
  }

  try {
    // 1. Soft delete pour ce participant
    const participant = await prisma.participant.findFirst({
      where: {
        conversationId,
        utilisateurId: user.id,
      },
    });

    if (!participant) {
      return NextResponse.json({ error: "Conversation non trouvée ou accès refusé" }, { status: 403 });
    }

    await prisma.participant.update({
      where: { id: participant.id },
      data: { supprimé: true },
    });

    // 2. Vérifie si tous les participants ont supprimé la conv
    const totalNonSuppr = await prisma.participant.count({
      where: {
        conversationId,
        supprimé: false,
      },
    });

    if (totalNonSuppr === 0) {
      // 3. Supprime tous les messages liés (optionnel mais propre)
      await prisma.message.deleteMany({
        where: { conversationId }
      });

      // 4. Supprime tous les participants
      await prisma.participant.deleteMany({
        where: { conversationId }
      });

      // 5. Supprime la conversation
      await prisma.conversation.delete({
        where: { id: conversationId }
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Erreur suppression conversation :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
