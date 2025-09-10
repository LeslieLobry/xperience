import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET manquant");

const ALLOWED_ORIGINS = [
  "http://localhost:8081",
  "http://localhost:19006",
  "http://localhost:3000",
  "https://www.x-periences.fr",
  "https://x-periences.fr",
];

function corsHeaders(origin = "") {
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "https://www.x-periences.fr";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Platform",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

// ---- Serializer BigInt-safe ----
function safeJson(data) {
  return JSON.parse(
    JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v))
  );
}

export async function OPTIONS(req) {
  const origin = req.headers.get("origin") || "";
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

/**
 * GET /api/avis?cibleId=123&take=10&beforeId=456
 * - cibleId: requis (int)
 * - take: optionnel (1..50, défaut 10)
 * - beforeId: optionnel (pagin. keyset) → retourne les avis avec id < beforeId
 */
export async function GET(req) {
  const origin = req.headers.get("origin") || "";
  const headers = corsHeaders(origin);

  try {
    const { searchParams } = new URL(req.url);
    const cibleIdRaw = searchParams.get("cibleId");
    const takeRaw = searchParams.get("take");
    const beforeIdRaw = searchParams.get("beforeId");

    const cibleId = parseInt(String(cibleIdRaw ?? ""), 10);
    if (!cibleId || Number.isNaN(cibleId)) {
      return NextResponse.json({ error: "Paramètre cibleId invalide" }, { status: 400, headers });
    }

    let take = parseInt(String(takeRaw ?? "10"), 10);
    if (Number.isNaN(take) || take < 1 || take > 50) take = 10;

    const where = { cibleId };
    if (beforeIdRaw != null && String(beforeIdRaw).length) {
      const b = parseInt(String(beforeIdRaw), 10);
      if (!Number.isNaN(b)) {
        // keyset pagination (par id décroissant)
        where.id = { lt: b };
      }
    }

    const avis = await prisma.avis.findMany({
      where,
      take,
      orderBy: { id: "desc" }, // stable pour keyset
      include: {
        auteur: {
          select: {
            id: true,
            pseudo: true,
            avatarUrl: true, // adapte aux champs réels
          },
        },
        // _count: { select: { likes: true } }, // si tu as une relation likes
      },
    });

    // Si besoin d’un “hasMore”:
    const lastId = avis.length ? avis[avis.length - 1].id : null;

    return NextResponse.json(
      safeJson({ items: avis, nextCursor: lastId }),
      { headers }
    );
  } catch (e) {
    console.error("❌ Erreur GET /api/avis :", e);
    return NextResponse.json(
      { error: "Erreur serveur lors de la récupération des avis." },
      { status: 500, headers }
    );
  }
}

// ---- Ton POST existant (inchangé) ----
export async function POST(req) {
  const origin = req.headers.get("origin") || "";
  const headers = corsHeaders(origin);

  try {
    const body = await req.json();

    // Auth: cookie OU Bearer
    const cookieStore = await cookies();
    let token = cookieStore.get("token")?.value;
    const auth = req.headers.get("authorization") || "";
    if (!token && auth.startsWith("Bearer ")) token = auth.slice(7);

    if (!token) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers });
    }

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json({ error: "Token invalide" }, { status: 403, headers });
    }

    const auteurId = parseInt(payload.id);
    const { cibleId, commentaire } = body || {};

    if (!cibleId || !commentaire) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400, headers });
    }
    if (auteurId === parseInt(cibleId)) {
      return NextResponse.json({ error: "Vous ne pouvez pas laisser un avis sur vous-même." }, { status: 400, headers });
    }

    const existing = await prisma.avis.findUnique({
      where: { auteurId_cibleId: { auteurId, cibleId: parseInt(cibleId) } },
    });
    if (existing) {
      return NextResponse.json({ error: "Vous avez déjà laissé un avis." }, { status: 400, headers });
    }

    const avis = await prisma.avis.create({
      data: { auteurId, cibleId: parseInt(cibleId), commentaire },
    });

    await prisma.digestNotification.create({
      data: { type: "AVIS", auteurId, destinataireId: parseInt(cibleId), avisId: avis.id },
    });

    return NextResponse.json(safeJson({ success: true, avis }), { headers });
  } catch (error) {
    console.error("❌ Erreur création avis :", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement." },
      { status: 500, headers }
    );
  }
}
