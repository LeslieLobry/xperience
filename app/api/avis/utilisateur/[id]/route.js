import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

// Prisma singleton en dev (évite les multiples instances)
let prisma;
if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) global.prisma = new PrismaClient();
  prisma = global.prisma;
}

// --- CORS ---
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

// --- JSON safe (BigInt -> string) ---
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

    const avis = await prisma.avis.findMany({
      where,
      take,
      orderBy: { id: "desc" }, // keyset pagination
      include: {
        auteur: {
          select: {
            id: true,
            pseudo: true,
            // ⚠️ si tu as un champ avatar/photo, ajoute-le ici explicitement.
            // avatarUrl: true, // ex.
          },
        },
      },
    });

    const nextCursor = avis.length ? avis[avis.length - 1].id : null;

    // Log utile
    console.log(`GET avis utilisateur ${cibleId} → ${avis.length} items`);

    return NextResponse.json(safeJson({ items: avis, nextCursor }), { headers });
  } catch (error) {
    console.error("❌ Erreur GET /api/avis/utilisateur/[id]:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la récupération des avis." },
      { status: 500, headers }
    );
  }
}
