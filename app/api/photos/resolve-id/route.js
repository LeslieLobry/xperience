import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getUserFromToken } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

/* -------- CORS (identique à /api/photos/[id]) -------- */
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

/* ---------------- Helpers ---------------- */
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
  try {
    const u = await getUserFromToken(); // cookie (web)
    if (u) return u;
  } catch {}
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m) {
    try {
      const u2 = await getUserFromToken(m[1]); // si ta fonction accepte le token brut
      if (u2) return u2;
    } catch {}
  }
  return null;
}

/**
 * Essaie plusieurs "groupes" de colonnes. Chaque tentative est isolée dans un try/catch :
 * si un champ n'existe pas dans TON schéma, on passe à la suivante sans 500.
 */
async function tryResolve(utilisateurId, k, name) {
  const uid = Number(utilisateurId);

  const attempts = [
    // 1) Colonnes classiques vues dans ton projet
    () =>
      prisma.photo.findFirst({
        select: { id: true },
        where: {
          utilisateurId: uid,
          OR: [
            { url: k }, { key: k }, { s3Key: k }, { path: k },
            { url: { endsWith: name } },
            { key: { endsWith: name } },
            { s3Key: { endsWith: name } },
            { path: { endsWith: name } },
          ],
        },
      }),

    // 2) Variantes fréquentes
    () =>
      prisma.photo.findFirst({
        select: { id: true },
        where: {
          utilisateurId: uid,
          OR: [
            { photoUrl: k }, { imageUrl: k }, { filename: k }, { filePath: k },
            { photoUrl: { endsWith: name } },
            { imageUrl: { endsWith: name } },
            { filename: { endsWith: name } },
            { filePath: { endsWith: name } },
          ],
        },
      }),

    // 3) Encore d'autres alias possibles
    () =>
      prisma.photo.findFirst({
        select: { id: true },
        where: {
          utilisateurId: uid,
          OR: [
            { photo: k }, { image: k }, { uri: k },
            { photo: { endsWith: name } },
            { image: { endsWith: name } },
            { uri: { endsWith: name } },
          ],
        },
      }),
  ];

  for (let i = 0; i < attempts.length; i++) {
    try {
      const res = await attempts[i]();
      if (res?.id) {
        console.log("[resolve-id] matched on attempt", i + 1, "→ id", res.id);
        return res.id;
      }
    } catch (e) {
      // On log mais on continue d'essayer (champ inconnu, etc.)
      console.warn("[resolve-id] attempt", i + 1, "failed:", e?.message);
    }
  }
  return null;
}

/* ------------- Handler commun POST / GET ------------- */
async function handleResolve(req) {
  const origin = req.headers.get("origin") || "";
  let key = "";

  // Récup param
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      key = body?.key || "";
    } else {
      const url = new URL(req.url);
      key = url.searchParams.get("key") || "";
    }
  } catch {}
  if (!key) {
    return NextResponse.json(
      { ok: false, error: "missing_key" },
      { status: 400, headers: corsHeaders(origin) }
    );
  }

  // Auth
  const user = await getUserFromReqSafe(req);
  if (!user?.id) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401, headers: corsHeaders(origin) }
    );
  }

  const k = normKey(key);
  const name = baseName(key);

  try {
    const id = await tryResolve(user.id, k, name);
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
    console.error("[resolve-id] fatal error:", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}

export async function POST(req) { return handleResolve(req); }
export async function GET(req)  { return handleResolve(req); }
