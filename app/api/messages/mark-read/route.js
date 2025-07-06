import { prisma } from "../../../../lib/prisma";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET;

async function getUserFromToken() {
  const cookieStore = cookies();
  const allCookies = await cookieStore;
  const token = allCookies.get("token")?.value;
  if (!token || !JWT_SECRET) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function POST(req) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { messageId } = await req.json();
    if (!messageId) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    // On récupère la conversation de ce message
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { conversationId: true }
    });

    if (!message) return NextResponse.json({ error: "Message non trouvé" }, { status: 404 });

    // Marque tous les messages de la conversation comme lus pour ce user (hors ses propres messages)
    await prisma.message.updateMany({
      where: {
        conversationId: message.conversationId,
        lu: false,
        auteurId: { not: user.id }
      },
      data: { lu: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
