import { prisma } from "../../../../lib/prisma";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { Realtime } from "ably";

const JWT_SECRET = process.env.JWT_SECRET;
const ABLY_API_KEY = process.env.ABLY_API_KEY; // Assure-toi de l'avoir

const ably = new Realtime(ABLY_API_KEY);

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

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { conversationId: true }
    });

    if (!message) return NextResponse.json({ error: "Message non trouvé" }, { status: 404 });

    // Met à jour lastReadAt dans participant (indispensable pour statut "vu")
    await prisma.participant.updateMany({
      where: {
        conversationId: message.conversationId,
        utilisateurId: user.id,
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    // Publie l'événement "read" sur Ably pour informer les autres clients
    const channel = ably.channels.get(`conversation-${message.conversationId}`);
    await channel.publish("read", {
      utilisateurId: user.id,
      lastReadAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
