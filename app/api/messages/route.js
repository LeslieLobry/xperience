// /app/api/messages/route.js
import { prisma } from "../../../lib/prisma";
import { NextResponse } from "next/server";

// POST /api/messages
export async function POST(req) {
  const body = await req.json();
  const { conversationId, auteurId, contenu, imageUrl, videoUrl, type } = body;

  if (!conversationId || !auteurId || (!contenu && !imageUrl && !videoUrl)) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  // Crée le message en base
  const message = await prisma.message.create({
    data: {
      conversationId,
      auteurId,
      contenu,
      imageUrl,
      videoUrl,
      type, // "TEXTE", "IMAGE" ou "VIDEO"
    },
    include: {
      auteur: true, // pour renvoyer le pseudo/photo de l'auteur
    },
  });

  // Met à jour la date de la conversation pour la trier par “dernier message”
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ message });
}

// GET /api/messages?conversationId=xxx
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const conversationId = parseInt(searchParams.get("conversationId"));

  if (!conversationId) {
    return NextResponse.json(
      { error: "conversationId requis" },
      { status: 400 }
    );
  }

  // Récupère tous les messages, triés par date croissante
  const messages = await prisma.message.findMany({
    where: { conversationId },
    include: {
      auteur: true, // pour récupérer le pseudo/photo du membre
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return NextResponse.json({ messages });
}
