import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const allowOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : "https://www.x-periences.fr";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Platform, X-Action, X-Client",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
    "Content-Type": "application/json",
  };
}
export async function OPTIONS(req) {
  const origin = req.headers.get("origin") || "";
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

/* ---------- BigInt-safe JSON ---------- */
function safeJson(data) {
  return JSON.parse(
    JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v))
  );
}

/**
 * GET /api/avis/utilisateur/[id]?take=10&beforeId=123&type=recus|laisses
 * - Par défaut renvoie les AVIS REÇUS (cibleId = id)
 * - Pagination par id DESC
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
    const userId = parseInt(String(idRaw), 10);
    if (Number.isNaN(userId) || userId <= 0) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400, headers });
    }

    const type = (searchParams.get("type") || "recus").toLowerCase();
    let take = parseInt(String(searchParams.get("take") ?? "10"), 10);
    if (Number.isNaN(take) || take < 1 || take > 50) take = 10;

    // where conforme à ton schéma
    const where =
      type === "laisses"
        ? { auteurId: userId }
        : { cibleId: userId }; // défaut: reçus

    const beforeIdRaw = searchParams.get("beforeId");
    if (beforeIdRaw) {
      const b = parseInt(String(beforeIdRaw), 10);
      if (!Number.isNaN(b)) where.id = { lt: b };
    }

    const rows = await prisma.avis.findMany({
      where,
      take,
      orderBy: { id: "desc" },
      include: {
        // champs existants dans Utilisateur d'après ton schéma
        auteur: { select: { id: true, pseudo: true, photoUrl: true } },
        cible: { select: { id: true, pseudo: true, photoUrl: true } },
      },
    });

    // Normalisation simple; avatar = photoUrl chez toi
    const items = rows.map((a) => ({
      id: a.id,
      commentaire: a.commentaire,
      createdAt: a.createdAt,
      auteur: a.auteur
        ? { id: a.auteur.id, pseudo: a.auteur.pseudo || "", avatarUrl: a.auteur.photoUrl || null }
        : null,
      cible: a.cible
        ? { id: a.cible.id, pseudo: a.cible.pseudo || "", avatarUrl: a.cible.photoUrl || null }
        : null,
    }));

    const nextCursor = items.length ? items[items.length - 1].id : null;
    return NextResponse.json(safeJson({ items, nextCursor }), { headers });
  } catch (error) {
    console.error("❌ GET /api/avis/utilisateur/[id]:", error?.code, error?.message);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500, headers });
  }
}
