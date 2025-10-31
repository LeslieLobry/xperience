// app/api/photos/resolve-id/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getUserFromToken } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

/* ---------- CORS identique à /api/photos/[id] ---------- */
function corsHeaders(origin = "") {
  const ALLOWED = [
    "http://localhost:8081",
    "http://localhost:19006",
    "https://www.x-periences.fr",
    "https://x-periences.fr",
  ];
  const allow = origin && ALLOWED.includes(origin) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(req) {
  const origin = req.headers.get("origin") || "";
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

/* ---------- Helpers ---------- */
function normKey(input = "") {
  try {
    const u = new URL(input, "https://www.x-periences.fr");
    return u.pathname; // "/uploads/.../file.ext" ou "/file.ext"
  } catch {
    return String(input).split("?")[0];
  }
}
function baseName(input = "") {
  return (normKey(input).split("/").pop() || "").toLowerCase();
}

async function getUserFromReqSafe(req) {
  // 1) Essai cookie (web)
  try {
    const u = await getUserFromToken();
    if (u) return u;
  } catch {
    // ignore
  }
  // 2) Essai Authorization: Bearer <token> (mobile)
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m) {
    try {
      // ⚠️ si getUserFromToken n'accepte pas d'argument dans ton projet,
      // remplace par getUserFromRawToken(m[1]) si tu en as une.
      const u2 = await getUserFromToken(m[1]);
      if (u2) return u2;
    } catch {
      // ignore
    }
  }
  return null;
}

async function resolveIdCore({ utilisateurId, key }) {
  const k = normKey(key);
  const name = baseName(key);

  // Si tu connais la/les colonnes exactes utilisées, adapte ici.
  // On cherche par chemin exact OU par nom de fichier.
  const photo = await prisma.photo.findFirst({
    select: { id: true },
    where: {
      utilisateurId: Number(utilisateurId),
      OR: [
        { url: k }, { key: k }, { s3Key: k }, { path: k },
        { url:   { endsWith: name } },
        { key:   { endsWith: name } },
        { s3Key: { endsWith: name } },
        { path:  { endsWith: name } },
      ],
    },
  });

  return photo?.id ?? null;
}

/* ---------- POST / GET ---------- */
async function handleResolve(req) {
  const origin = req.headers.get("origin") || "";
  let key = "";

  // lecture param
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      key = body?.key || "";
    } else if (req.method === "GET") {
      const url = new URL(req.url);
      key = url.searchParams.get("key") || "";
    }
  } catch {
    key = "";
  }

  if (!key) {
    return NextResponse.json(
      { ok: false, error: "missing key" },
      { status: 400, headers: corsHeaders(origin) }
    );
  }

  // auth
  const user = await getUserFromReqSafe(req);
  if (!user || !user.id) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401, headers: corsHeaders(origin) }
    );
  }

  try {
    const id = await resolveIdCore({ utilisateurId: user.id, key });
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404, headers: corsHeaders(origin) }
      );
    }
    return NextResponse.json(
      { ok: true, id },
      { status: 200, headers: corsHeaders(origin) }
    );
  } catch (e) {
    // log côté serveur
    console.error("resolve-id error:", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}

export async function POST(req) {
  return handleResolve(req);
}
export async function GET(req) {
  return handleResolve(req);
}
