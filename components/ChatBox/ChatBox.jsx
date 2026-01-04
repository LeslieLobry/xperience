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

  // NOTE: cookies() est sync normalement, mais je ne change pas ton code ici
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

    const userId = Number(user.id); // ✅ sécurise le type
    if (!Number.isFinite(userId)) {
      return NextResponse.json(
        { error: "Utilisateur invalide" },
        { status: 401, headers: CORS }
      );
    }

    let body = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const messageId = body?.messageId ? Number(body.messageId) : null;
    const conversationId = body?.conversationId ? Number(body.conversationId) : null;

    if (!messageId && !conversationId) {
      return NextResponse.json(
        { error: "messageId ou conversationId manquant" },
        { status: 400, headers: CORS }
      );
    }

    let convId = conversationId;

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

    const isParticipant = await prisma.participant.findFirst({
      where: { conversationId: convId, utilisateurId: userId },
      select: { id: true },
    });

    if (!isParticipant) {
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403, headers: CORS }
      );
    }

    const now = new Date();

    // ✅ lastReadAt
    await prisma.participant.updateMany({
      where: { conversationId: convId, utilisateurId: userId },
      data: { lastReadAt: now },
    });

    // ✅ (OPTIONNEL MAIS SOUVENT NÉCESSAIRE) : marquer les messages comme lus
    // ⚠️ adapte "destinataireId" si ton champ s'appelle autrement
    try {
      await prisma.message.updateMany({
        where: {
          conversationId: convId,
          destinataireId: userId, // <-- adapte si besoin
          lu: false,
        },
        data: { lu: true },
      });
    } catch (e) {
      // Si ton schema n'a pas destinataireId/lu, on ne casse pas l'API
      console.warn("message.updateMany(lu=true) skipped:", e?.message || e);
    }

    // ✅ LE FIX PRINCIPAL : supprimer les notifications MESSAGE de cette conversation
    // ⚠️ adapte les champs si besoin : userId / type / conversationId
    try {
      await prisma.notification.deleteMany({
        where: {
          userId: userId,
          type: "MESSAGE",        // <-- adapte si enum/valeur différente
          conversationId: convId, // <-- adapte si ton notif stocke autrement
        },
      });
    } catch (e) {
      console.warn("notification.deleteMany skipped:", e?.message || e);
    }

    // ✅ Ably : event read dans la conversation
    if (ably) {
      try {
        ably.channels.get(`conversation-${convId}`).publish("read", {
          utilisateurId: userId,
          lastReadAt: now.toISOString(),
          conversationId: convId,
        });

        // ✅ Ably : event "clear notif" pour que ton UI notif se mette à jour sans refresh
        ably.channels.get(`notification-${userId}`).publish("notif:clear-conversation", {
          conversationId: convId,
        });
      } catch (e) {
        console.warn("Ably publish failed:", e?.message || e);
      }
    }

    return NextResponse.json({ success: true }, { status: 200, headers: CORS });
  } catch (error) {
    console.error("mark-as-read error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500, headers: CORS }
    );
  }
}
