import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "../../../../lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET;

async function getUserFromToken() {
  const token = cookies().get("token")?.value;
  if (!token || !JWT_SECRET) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch {
    return null;
  }
}

export async function GET(req, { params }) {
  const decoded = await getUserFromToken();
  if (!decoded) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = decoded.id;
  const conversationId = parseInt(params.id, 10);

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: {
        include: {
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
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  const interlocuteur = conversation.participants
    .map((p) => p.utilisateur)
    .find((u) => u.id !== userId);

  if (!interlocuteur) {
    return NextResponse.json({ error: "Aucun interlocuteur trouvé" }, { status: 400 });
  }

  const blocage = await prisma.blocage.findFirst({
    where: {
      bloqueurId: userId,
      bloquéId: interlocuteur.id,
    },
  });

  return NextResponse.json({
    interlocuteur: {
      ...interlocuteur,
      estBloqueParUtilisateur: !!blocage,
    },
  });
}

export async function DELETE(req, { params }) {
  const decoded = await getUserFromToken();
  if (!decoded) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = decoded.id;
  const conversationId = parseInt(params.id, 10);
  if (!conversationId || isNaN(conversationId)) {
    return NextResponse.json({ error: "ID conversation invalide" }, { status: 400 });
  }

  try {
    // 1. Marquer comme supprimé pour l'utilisateur courant
    await prisma.participant.updateMany({
      where: {
        conversationId,
        utilisateurId: userId,
      },
      data: {
        supprimé: true,
      },
    });

    // 2. Vérifier si tous les participants ont supprimé la conversation
    const participants = await prisma.participant.findMany({
      where: { conversationId },
    });

    const tousOntSupprimé = participants.every((p) => p.supprimé);

    if (tousOntSupprimé) {
      // 3. Supprimer les messages
      await prisma.message.deleteMany({ where: { conversationId } });

      // 4. Supprimer les participants
      await prisma.participant.deleteMany({ where: { conversationId } });

      // 5. Supprimer la conversation
      await prisma.conversation.delete({ where: { id: conversationId } });

      return NextResponse.json({
        success: true,
        message: "Conversation supprimée définitivement",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Conversation masquée pour l'utilisateur",
    });
  } catch (err) {
    console.error("Erreur suppression conversation:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
