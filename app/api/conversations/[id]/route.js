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

// DELETE /api/conversations/[id]
export async function DELETE(req, context) {
  const { params } = await context;
  const user = await getUserFromToken();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const conversationId = parseInt(params?.id);
  if (!conversationId || isNaN(conversationId)) {
    return NextResponse.json({ error: "ID de conversation invalide" }, { status: 400 });
  }

  try {
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

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Erreur suppression conversation :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
