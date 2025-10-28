import { prisma } from "../../../../lib/prisma";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { Rest as AblyRest } from "ably";

export const runtime = "nodejs"; // explicite

const JWT_SECRET = process.env.JWT_SECRET;
const ABLY_API_KEY = process.env.NEXT_PUBLIC_ABLY_API_KEY;

const ably = new AblyRest(ABLY_API_KEY);

const CORS = {
  "Access-Control-Allow-Origin": "*", 
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

async function getUserFromToken() {
  const token = (await cookies()).get("token")?.value;
  if (!token || !JWT_SECRET) return null;
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
} 

export async function POST(req) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers: CORS });

    const { messageId } = await req.json();
    if (!messageId) return NextResponse.json({ error: "ID manquant" }, { status: 400, headers: CORS });

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { conversationId: true }
    });
    if (!message) return NextResponse.json({ error: "Message non trouvé" }, { status: 404, headers: CORS });

    await prisma.participant.updateMany({
      where: { conversationId: message.conversationId, utilisateurId: user.id },
      data: { lastReadAt: new Date() },
    });

    // Publish via Ably REST
    const channel = ably.channels.get(`conversation-${message.conversationId}`);
    await channel.publish("read", {
      utilisateurId: user.id,
      lastReadAt: new Date().toISOString(),
    });

    return new NextResponse(JSON.stringify({ success: true }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("mark-as-read error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: CORS });
  }
}
