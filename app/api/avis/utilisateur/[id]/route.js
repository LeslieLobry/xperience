import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

// Prisma singleton
let prisma;
if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) global.prisma = new PrismaClient();
  prisma = global.prisma;
}

/* ---------------- CORS ---------------- */
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

/* -------- BigInt-safe JSON -------- */
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
 * GET /api/avis/utilisateur/[id]?take=10&beforeDate=2025-09-10T12:00:00.000Z
 * - id: requis
 * - take: 1..50 (10 par défaut)
 * - beforeDate: ISO optionnel (pagination par date)
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

    const beforeDateRaw = searchParams.get("beforeDate");
    const where = { cibleId };
    if (beforeDateRaw) {
      const d = new Date(beforeDateRaw);
      if (!isNaN(d.getTime())) {
        where.createdAt = { lt: d };
      }
    }

    const rows = await prisma.avis.findMany({
      where,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        // Inclure tout l'auteur pour éviter les erreurs de champs inconnus
        auteur: true,
      },
    });

    // Normalisation avatar : on expose un seul champ "avatarUrl"
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
          avatarUrl, // <- unique champ côté client
        },
      };
    });

    const nextCursorDate = items.length ? items[items.length - 1].createdAt : null;

    console.log(`GET /api/avis/utilisateur/${cibleId} → ${items.length} avis`);

    return NextResponse.json(
      safeJson({ items, nextCursorDate }),
      { headers }
    );
  } catch (error) {
    console.error("❌ Erreur GET /api/avis/utilisateur/[id]:", error?.message);
    // Retourner le message aussi en prod temporairement pour debug
    return NextResponse.json(
      { error: "Erreur serveur", message: String(error?.message || "") },
      { status: 500, headers }
    );
  }
}
