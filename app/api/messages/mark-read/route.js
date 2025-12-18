import { prisma } from "../../../../lib/prisma";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { Rest as AblyRest } from "ably";

export const runtime = "nodejs"; // explicite

const JWT_SECRET = process.env.JWT_SECRET;

// ✅ Ne casse pas l’existant : on garde NEXT_PUBLIC en fallback,
// mais idéalement mets une clé serveur ABLY_API_KEY_SERVER
const ABLY_API_KEY =
  process.env.ABLY_API_KEY_SERVER ||
  process.env.ABLY_API_KEY ||
  process.env.NEXT_PUBLIC_ABLY_API_KEY;

const ably = ABLY_API_KEY ? new AblyRest(ABLY_API_KEY) : null;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ✅ Cookie (site) OU Bearer (mobile)
async function getUserFromToken(req) {
  if (!JWT_SECRET) return null;

  // 1) Mobile: Authorization: Bearer xxx
  const auth = req?.headers?.get?.("authorization") || "";
  if (auth.startsWith("Bearer ")) {
    const token = auth.slice(7);
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch {
      return null;
    }
  }

  // 2) Web: cookie "token"
  const token = (await cookies()).get("token")?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401, headers: CORS }
      );
    }

    let body = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const { messageId } = body;
    if (!messageId) {
      return NextResponse.json(
        { error: "ID manquant" },
        { status: 400, headers: CORS }
      );
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { conversationId: true },
    });

    if (!message) {
      return NextResponse.json(
        { error: "Message non trouvé" },
        { status: 404, headers: CORS }
      );
    }

    await prisma.participant.updateMany({
      where: { conversationId: message.conversationId, utilisateurId: user.id },
      data: { lastReadAt: new Date() },
    });

    // ✅ Publish via Ably REST (si configuré)
    if (ably) {
      const channel = ably.channels.get(`conversation-${message.conversationId}`);
      await channel.publish("read", {
        utilisateurId: user.id,
        lastReadAt: new Date().toISOString(),
      });
    }

    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("mark-as-read error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500, headers: CORS }
    );
  }
}
