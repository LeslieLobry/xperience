import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getUserFromToken } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

/* -------- CORS -------- */
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

/* -------- Helpers -------- */
function normKey(input = "") {
  try { const u = new URL(input, "https://www.x-periences.fr"); return u.pathname; }
  catch { return String(input).split("?")[0]; }
}
function baseName(input = "") {
  return (normKey(input).split("/").pop() || "").toLowerCase();
}

async function getUserFromReqSafe(req) {
  try { const u = await getUserFromToken(); if (u) return u; } catch {}
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m) { try { const u2 = await getUserFromToken(m[1]); if (u2) return u2; } catch {} }
  return null;
}

const COLS_STRICT = ["url","key","s3Key","path","photoUrl","imageUrl","filename","filePath","photo","image","uri"];
const OR_strict = (k, name) => [
  ...COLS_STRICT.map(c => ({ [c]: k })),                         // égalité
  ...COLS_STRICT.map(c => ({ [c]: { endsWith: name } })),       // se termine par filename
];

const OR_contains = (name) => [
  ...COLS_STRICT.map(c => ({ [c]: { contains: name, mode: "insensitive" } })),
];

/* -------- Handler commun -------- */
async function doResolve({ utilisateurId, key }) {
  const uid = Number(utilisateurId);
  const k = normKey(key);
  const name = baseName(key);

  // 1) strict (égalité / endsWith)
  try {
    const p1 = await prisma.photo.findFirst({
      select: { id: true, utilisateurId: true },
      where: { utilisateurId: uid, OR: OR_strict(k, name) },
      orderBy: { id: "desc" },
    });
    if (p1?.id) { console.log("[resolve-id] strict hit", p1.id); return p1.id; }
  } catch (e) { console.warn("[resolve-id] strict failed:", e?.message); }

  // 2) contains insensible (plus permissif)
  try {
    const p2 = await prisma.photo.findFirst({
      select: { id: true, utilisateurId: true },
      where: { utilisateurId: uid, OR: OR_contains(name) },
      orderBy: { id: "desc" },
    });
    if (p2?.id) { console.log("[resolve-id] contains hit", p2.id); return p2.id; }
  } catch (e) { console.warn("[resolve-id] contains failed:", e?.message); }

  // 3) dernier recours: sans filtre user (debug), puis vérification ownership
  try {
    const p3 = await prisma.photo.findFirst({
      select: { id: true, utilisateurId: true },
      where: { OR: [...OR_strict(k, name), ...OR_contains(name)] },
      orderBy: { id: "desc" },
    });
    if (p3?.id) {
      if (Number(p3.utilisateurId) === uid) {
        console.log("[resolve-id] loose hit", p3.id);
        return p3.id;
      } else {
        console.log("[resolve-id] found but belongs to", p3.utilisateurId, "≠", uid);
        return null; // sécurité: pas au user courant
      }
    }
  } catch (e) { console.warn("[resolve-id] loose failed:", e?.message); }

  return null;
}

async function handleResolve(req) {
  const origin = req.headers.get("origin") || "";
  let key = "";
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      key = body?.key || "";
    } else {
      const u = new URL(req.url);
      key = u.searchParams.get("key") || "";
    }
  } catch {}
  if (!key) return NextResponse.json({ ok:false, error:"missing_key" }, { status:400, headers: corsHeaders(origin) });

  const user = await getUserFromReqSafe(req);
  if (!user?.id) return NextResponse.json({ ok:false, error:"unauthorized" }, { status:401, headers: corsHeaders(origin) });

  try {
    const id = await doResolve({ utilisateurId: user.id, key });
    if (!id) return NextResponse.json({ ok:false, error:"not_found" }, { status:404, headers: corsHeaders(origin) });
    return NextResponse.json({ ok:true, id }, { status:200, headers: corsHeaders(origin) });
  } catch (e) {
    console.error("[resolve-id] fatal:", e);
    return NextResponse.json({ ok:false, error:"server_error" }, { status:500, headers: corsHeaders(origin) });
  }
}

export async function POST(req){ return handleResolve(req); }
export async function GET(req){ return handleResolve(req); }
