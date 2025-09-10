import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

/** ✅ Force Node.js runtime (obligatoire pour Prisma sur Vercel) */
export const runtime = "nodejs";
/** (optionnel) évite le cache RSC sur cette route */
export const dynamic = "force-dynamic";

/* ---------- Prisma singleton ---------- */
let prisma;
if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) global.prisma = new PrismaClient();
  prisma = global.prisma;
}

/* ---------- CORS ---------- */
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
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Platform, X-Action, X-Client",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
    "Content-Type": "application/json",
  };
}

/* ---------- BigInt-safe JSON ---------- */
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
 * GET /api/avis/utilisateur/[id]?take=10&beforeId=123
 * - tri par id (champ sûr) pour éviter l’erreur si createdAt n’existe pas
 */
export async function GET(req, { params }) {
  const origin = req.headers.get("origin") || "";
  const headers = corsHeaders(origin);

  try {
    const { searchParams } = new URL(req.url);

    const idRaw = params?.id;
    if (!idRaw) {
      return NextResponse.json({ error: "ID requis" }, { status: 400, headers });
    }
    const cibleId = parseInt(String(idRaw), 10);
    if (Number.isNaN(cibleId)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400, headers });
    }

    let take = parseInt(String(searchParams.get("take") ?? "10"), 10);
    if (Number.isNaN(take) || take < 1 || take > 50) take = 10;

    const where = { cibleId };
    const beforeIdRaw = searchParams.get("beforeId");
    if (beforeIdRaw != null && String(beforeIdRaw).length) {
      const b = parseInt(String(beforeIdRaw), 10);
      if (!Number.isNaN(b)) where.id = { lt: b };
    }

    const rows = await prisma.avis.findMany({
      where,
      take,
      orderBy: { id: "desc" }, // ✅ champ toujours présent
      include: {
        // ✅ on inclut tout l'auteur pour éviter les 'Unknown arg ... in select'
        auteur: true,
      },
    });

    // Normalisation de l’avatar → un seul champ "avatarUrl" côté client
    const items = rows.map((a) => {
      const { auteur, ...rest } = a;
      const avatarUrl =
        auteur?.avatarUrl ??
        auteur?.photoUrl ??
        auteur?.avatar ??
        null;
      return {
        ...rest,
        auteur: {
          id: auteur?.id ?? null,
          pseudo: auteur?.pseudo ?? "",
          avatarUrl,
        },
      };
    });

    const nextCursor = items.length ? items[items.length - 1].id : null;

    return NextResponse.json(safeJson({ items, nextCursor }), { headers });
  } catch (error) {
    // On renvoie explicitement le message pour débogage
    const payload = {
      error: "Erreur serveur",
      message: String(error?.message || ""),
      // décommente temporairement si besoin
      // stack: String(error?.stack || ""),
    };
    console.error("❌ GET /api/avis/utilisateur/[id] :", payload);
    return NextResponse.json(payload, { status: 500, headers });
  }
}
