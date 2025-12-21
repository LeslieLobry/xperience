import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "../../../../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
 * - recus: cibleId = id (avis reçus)
 * - laisses: auteurId = id (avis laissés)
 * - pagination id DESC
 */
export async function GET(req, { params }) {
  const origin = req.headers.get("origin") || "";
  const headers = corsHeaders(origin);
  const requestId = crypto.randomBytes(8).toString("hex");

  try {
    const { searchParams } = new URL(req.url);

    const idRaw = params?.id;
    if (!idRaw) {
      return NextResponse.json(
        { error: "ID requis", requestId },
        { status: 400, headers }
      );
    }

    const userId = Number(String(idRaw));
    if (!Number.isFinite(userId) || userId <= 0) {
      return NextResponse.json(
        { error: "ID invalide", requestId },
        { status: 400, headers }
      );
    }

    const type = (searchParams.get("type") || "recus").toLowerCase();
    let take = Number(searchParams.get("take") || 10);
    if (!Number.isFinite(take) || take < 1 || take > 50) take = 10;

    const where = type === "laisses" ? { auteurId: userId } : { cibleId: userId };

    const beforeIdRaw = searchParams.get("beforeId");
    if (beforeIdRaw) {
      const b = Number(beforeIdRaw);
      if (Number.isFinite(b) && b > 0) {
        where.id = { lt: b };
      }
    }

    // ⚠️ Important : si "photoUrl" n'existe PAS dans ton modèle Utilisateur,
    // Prisma plantera ici en 500 ("Unknown field"). Dans ce cas, enlève photoUrl.
    const rows = await prisma.avis.findMany({
      where,
      take,
      orderBy: { id: "desc" },
      select: {
        id: true,
        commentaire: true,
        createdAt: true,
        auteur: {
          select: { id: true, pseudo: true, photoUrl: true },
        },
        cible: {
          select: { id: true, pseudo: true, photoUrl: true },
        },
      },
    });

    const items = rows.map((a) => ({
      id: a.id,
      commentaire: a.commentaire,
      createdAt: a.createdAt,
      auteur: a.auteur
        ? {
            id: a.auteur.id,
            pseudo: a.auteur.pseudo || "",
            avatarUrl: a.auteur.photoUrl || null,
          }
        : null,
      cible: a.cible
        ? {
            id: a.cible.id,
            pseudo: a.cible.pseudo || "",
            avatarUrl: a.cible.photoUrl || null,
          }
        : null,
    }));

    const nextCursor = items.length ? items[items.length - 1].id : null;

    return NextResponse.json(
      safeJson({ ok: true, items, nextCursor, requestId }),
      { headers }
    );
  } catch (error) {
    console.error("❌ GET /api/avis/utilisateur/[id]:", {
      requestId,
      prismaCode: error?.code,
      message: error?.message,
    });

    return NextResponse.json(
      { error: "INTERNAL_ERROR", requestId },
      { status: 500, headers }
    );
  }
}
