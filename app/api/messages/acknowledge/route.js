import { prisma } from "../../../../lib/prisma";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const JWT_SECRET = process.env.JWT_SECRET;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ✅ Cookie (site) OU Bearer (mobile)
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

    const messageId = body?.messageId ? Number(body.messageId) : null;

    // ✅ Nouveau (optionnel) : batch
    const messageIds = Array.isArray(body?.messageIds)
      ? body.messageIds.map((x) => Number(x)).filter((n) => !Number.isNaN(n))
      : null;

    if (!messageId && (!messageIds || messageIds.length === 0)) {
      return NextResponse.json(
        { error: "ID manquant" },
        { status: 400, headers: CORS }
      );
    }

    const ids = messageIds?.length ? messageIds : [messageId];

    // ✅ on récupère conversationId pour vérifier les droits
    const messages = await prisma.message.findMany({
      where: { id: { in: ids } },
      select: { id: true, conversationId: true },
    });

    if (!messages.length) {
      return NextResponse.json(
        { error: "Message(s) introuvable(s)" },
        { status: 404, headers: CORS }
      );
    }

    const convIds = [...new Set(messages.map((m) => m.conversationId))];

    // ✅ l'utilisateur doit être participant de TOUTES les conversations concernées
    const participantCount = await prisma.participant.count({
      where: {
        utilisateurId: user.id,
        conversationId: { in: convIds },
      },
    });

    if (participantCount !== convIds.length) {
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403, headers: CORS }
      );
    }

    // ✅ update en une seule requête
    await prisma.message.updateMany({
      where: { id: { in: messages.map((m) => m.id) } },
      data: { lu: true },
    });

    return NextResponse.json(
      { success: true },
      { status: 200, headers: CORS }
    );
  } catch (err) {
    console.error("❌ Erreur acknowledge :", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500, headers: CORS }
    );
  }
}
