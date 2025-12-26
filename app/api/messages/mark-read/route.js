import { prisma } from "../../../../lib/prisma";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { Rest as AblyRest } from "ably";

export const runtime = "nodejs";

const JWT_SECRET = process.env.JWT_SECRET;

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

async function getUserFromToken(req) {
  if (!JWT_SECRET) return null;

  const auth = req?.headers?.get?.("authorization") || "";
  if (auth.startsWith("Bearer ")) {
    const token = auth.slice(7);
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch {
      return null;
    }
  }

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

    // ✅ compat: messageId toujours accepté
    const messageId = body?.messageId ? Number(body.messageId) : null;

    // ✅ nouveau: conversationId direct (évite 1 requête DB)
    const conversationId = body?.conversationId ? Number(body.conversationId) : null;

    if (!messageId && !conversationId) {
      return NextResponse.json(
        { error: "messageId ou conversationId manquant" },
        { status: 400, headers: CORS }
      );
    }

    let convId = conversationId;

    // Si on n'a pas conversationId, on le récupère via messageId (comportement actuel)
    if (!convId) {
      const msg = await prisma.message.findUnique({
        where: { id: messageId },
        select: { conversationId: true },
      });

      if (!msg) {
        return NextResponse.json(
          { error: "Message non trouvé" },
          { status: 404, headers: CORS }
        );
      }
      convId = msg.conversationId;
    }

    // ✅ sécurité: l'utilisateur doit être participant
    const isParticipant = await prisma.participant.findFirst({
      where: { conversationId: convId, utilisateurId: user.id },
      select: { id: true },
    });

    if (!isParticipant) {
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403, headers: CORS }
      );
    }

    const now = new Date();

    // ✅ update lastReadAt
    await prisma.participant.updateMany({
      where: { conversationId: convId, utilisateurId: user.id },
      data: { lastReadAt: now },
    });

    // ✅ Ably: best-effort (ne bloque pas la réponse si Ably est lent)
    if (ably) {
      try {
        const channel = ably.channels.get(`conversation-${convId}`);
        // pas besoin d'attendre pour répondre vite
        channel.publish("read", {
          utilisateurId: user.id,
          lastReadAt: now.toISOString(),
          conversationId: convId,
        });
      } catch (e) {
        // on log, mais on ne casse pas l’API
        console.warn("Ably publish read failed:", e?.message || e);
      }
    }

    return NextResponse.json(
      { success: true },
      { status: 200, headers: CORS }
    );
  } catch (error) {
    console.error("mark-as-read error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500, headers: CORS }
    );
  }
}
