import { prisma } from "../../../lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.JWT_SECRET;

const ALLOWED_ORIGINS = [
  "http://localhost:8081",
  "http://localhost:19006",
  "http://localhost:3000",
  "https://www.x-periences.fr",
  "https://x-periences.fr",
];

function corsHeaders(origin = "") {
  const allowOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : "https://www.x-periences.fr";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Platform",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

// BigInt-safe
function safeJson(data) {
  return JSON.parse(
    JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v))
  );
}

export async function OPTIONS(req) {
  const origin = req.headers.get("origin") || "";
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

function extractUserIdFromJwtPayload(payload) {
  const raw = payload?.userId ?? payload?.id ?? payload?.utilisateurId ?? null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function POST(req) {
  const origin = req.headers.get("origin") || "";
  const headers = corsHeaders(origin);
  const requestId = crypto.randomBytes(8).toString("hex");

  try {
    if (!JWT_SECRET) {
      console.error("❌ JWT_SECRET manquant", { requestId });
      return NextResponse.json(
        { error: "Configuration serveur manquante.", requestId },
        { status: 500, headers }
      );
    }

    // Body JSON
    let body = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Body JSON invalide.", requestId },
        { status: 400, headers }
      );
    }

    // Auth: cookie OU Bearer
    const cookieStore = await cookies();
    let token = cookieStore.get("token")?.value;
    const auth = req.headers.get("authorization") || "";
    if (!token && auth.startsWith("Bearer ")) token = auth.slice(7);

    if (!token) {
      return NextResponse.json(
        { error: "Non authentifié", requestId },
        { status: 401, headers }
      );
    }

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json(
        { error: "Token invalide", requestId },
        { status: 403, headers }
      );
    }

    const auteurId = extractUserIdFromJwtPayload(payload);
    if (!auteurId) {
      console.error("❌ auteurId introuvable dans le JWT", { requestId, payload });
      return NextResponse.json(
        { error: "Session invalide.", requestId },
        { status: 401, headers }
      );
    }

    const cibleId = Number(body?.cibleId);
    const commentaire = String(body?.commentaire || "").trim();

    if (!Number.isFinite(cibleId) || cibleId <= 0) {
      return NextResponse.json(
        { error: "Champs requis manquants", requestId },
        { status: 400, headers }
      );
    }
    if (!commentaire) {
      return NextResponse.json(
        { error: "Champs requis manquants", requestId },
        { status: 400, headers }
      );
    }
    if (auteurId === cibleId) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas laisser un avis sur vous-même.", requestId },
        { status: 400, headers }
      );
    }

    // Déjà laissé ?
    const existing = await prisma.avis.findUnique({
      where: { auteurId_cibleId: { auteurId, cibleId } },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Vous avez déjà laissé un avis.", requestId },
        { status: 400, headers }
      );
    }

    // Create avis
    const avis = await prisma.avis.create({
      data: { auteurId, cibleId, commentaire },
    });

    // ⚠️ IMPORTANT : si digestNotification a un champ obligatoire (ex conversationId),
    // cette création peut planter. On ne doit PAS faire échouer l'avis pour ça.
    try {
      await prisma.digestNotification.create({
        data: {
          type: "AVIS",
          auteurId,
          destinataireId: cibleId,
          avisId: avis.id,
          // conversationId: ... (si tu veux le lier à une conversation)
        },
      });
    } catch (e) {
      console.error("⚠️ digestNotification.create a échoué", {
        requestId,
        prismaCode: e?.code,
        message: e?.message,
      });
    }

    return NextResponse.json(
      safeJson({ success: true, avis, requestId }),
      { headers }
    );
  } catch (error) {
    console.error("❌ Erreur création avis :", {
      requestId,
      prismaCode: error?.code,
      message: error?.message,
    });

    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement.", requestId },
      { status: 500, headers }
    );
  }
}
