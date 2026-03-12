// app/api/conversations/[id]/mark-as-read/route.js
import { prisma } from "../../../../../lib/prisma";
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

// POST /api/conversations/{conversationId}/mark-as-read
export async function POST(req, { params }) {
  try {
    const user = await getUserFromToken(req);

    if (!user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const conversationId = parseInt(params.id, 10);

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId invalide" },
        { status: 400 }
      );
    }

    const participant = await prisma.participant.findFirst({
      where: {
        conversationId,
        utilisateurId: user.id,
      },
      select: { id: true },
    });

    if (!participant) {
      return NextResponse.json(
        { error: "Participant introuvable" },
        { status: 404 }
      );
    }

    const now = new Date();

    await prisma.participant.updateMany({
      where: {
        conversationId,
        utilisateurId: user.id,
      },
      data: {
        lastReadAt: now,
      },
    });

    await prisma.message.updateMany({
      where: {
        conversationId,
        auteurId: { not: user.id },
        lu: false,
      },
      data: { lu: true },
    });

    const convStr = String(conversationId);

    await prisma.notification.updateMany({
      where: {
        utilisateurId: user.id,
        lu: false,
        OR: [
          { lien: { contains: convStr } },
          { message: { contains: convStr } },
        ],
      },
      data: { lu: true },
    });

    if (ably) {
      try {
        await ably
          .channels.get(`notification-${user.id}`)
          .publish("notif:clear-conversation", {
            conversationId,
            utilisateurId: user.id,
            lastReadAt: now.toISOString(),
          });

        await ably
          .channels.get(`notification-${user.id}`)
          .publish("refresh-conversations", {
            conversationId,
            utilisateurId: user.id,
            reason: "mark-as-read",
            lastReadAt: now.toISOString(),
          });
      } catch (e) {
        console.warn("Ably publish mark-as-read failed:", e?.message || e);
      }
    }

    return NextResponse.json({
      success: true,
      conversationId,
      lastReadAt: now.toISOString(),
    });
  } catch (err) {
    console.error("Erreur mark-as-read:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}