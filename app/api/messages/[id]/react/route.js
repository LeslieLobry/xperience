import { prisma } from "../../../../../lib/prisma";
import { getUserFromToken } from "../../../../../lib/auth";
import { NextResponse } from "next/server";

export async function POST(req, { params }) {
  const user = await getUserFromToken();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const messageId = parseInt(params.id);
  const { emoji } = await req.json();
  if (!emoji) return NextResponse.json({ error: "Emoji requis" }, { status: 400 });

  // Supprimer l'ancienne réaction
  await prisma.messageReaction.deleteMany({
    where: { messageId, utilisateurId: user.id },
  });

  // Créer la nouvelle
  await prisma.messageReaction.create({
    data: { messageId, utilisateurId: user.id, emoji },
  });

  // Renvoyer toutes les réactions du message
  const reactions = await prisma.messageReaction.findMany({
    where: { messageId },
    select: {
      utilisateurId: true,
      emoji: true,
    },
  });

  return NextResponse.json({ success: true, reactions });
}
