import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "../../../../lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(req, { params }) {
  const token = cookies().get("token")?.value;
  if (!token || !JWT_SECRET) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return NextResponse.json({ error: "Token invalide" }, { status: 403 });
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
              photoUrl: true, // ✅ CHANGÉ ICI
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
    .map(p => p.utilisateur)
    .find(u => u.id !== userId);

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
