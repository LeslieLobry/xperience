import { NextResponse } from "next/server";
import { headers } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "../../../../lib/prisma";
import { isBlockedBetween } from "../../../../lib/utilsFiltrage";

const JWT_SECRET = process.env.JWT_SECRET;

async function getUserFromToken() {
  const headerList = headers(); // pas besoin de await ici
  const cookieHeader = headerList.get("cookie") || "";
  const tokenMatch = cookieHeader.match(/token=([^;]+)/);
  const token = tokenMatch?.[1];

  if (!token || !JWT_SECRET) return null;

  try {
    return jwt.verify(token, JWT_SECRET);
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

  if (!conversationId || isNaN(conversationId)) {
    return NextResponse.json({ error: "ID conversation invalide" }, { status: 400 });
  }

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
    return NextResponse.json({ error: "Aucun autre participant trouvé" }, { status: 400 });
  }

  const estBloque = await isBlockedBetween(userId, interlocuteur.id);
  if (estBloque) {
    return NextResponse.json({ error: "Utilisateur bloqué" }, { status: 403 });
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
    const participants = await prisma.participant.findMany({
      where: { conversationId },
      include: { utilisateur: true },
    });

    const interlocuteur = participants
      .map((p) => p.utilisateur)
      .find((u) => u.id !== userId);

    if (interlocuteur) {
      const estBloque = await isBlockedBetween(userId, interlocuteur.id);
      if (estBloque) {
        return NextResponse.json({ error: "Utilisateur bloqué" }, { status: 403 });
      }
    }

    await prisma.participant.updateMany({
      where: {
        conversationId,
        utilisateurId: userId,
      },
      data: {
        supprimé: true,
      },
    });

    const updatedParticipants = await prisma.participant.findMany({
      where: { conversationId },
    });

    const tousOntSupprimé = updatedParticipants.every((p) => p.supprimé);

    if (tousOntSupprimé) {
      await prisma.message.deleteMany({ where: { conversationId } });
      await prisma.participant.deleteMany({ where: { conversationId } });
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
