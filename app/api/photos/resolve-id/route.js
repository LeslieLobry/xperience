import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getUserFromToken } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

/* ---- CORS identique à ta route /api/photos/[id] ---- */
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
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

export async function OPTIONS(req) {
  const origin = req.headers.get("origin") || "";
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

async function getUserFromReq(req) {
  // 1) cookie (web)
  const cookieUser = await getUserFromToken().catch(() => null);
  if (cookieUser) return cookieUser;

  // 2) Authorization: Bearer <token> (mobile)
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  return await getUserFromToken(m[1]).catch(() => null);
}

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

export async function POST(req) {
  const origin = req.headers.get("origin") || "";
  try {
    const { key } = await req.json().catch(() => ({}));
    if (!key) {
      return NextResponse.json(
        { ok: false, error: "missing key" },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const user = await getUserFromReq(req);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401, headers: corsHeaders(origin) }
      );
    }

    const k = normKey(key);
    const name = baseName(key);

    const photo = await prisma.photo.findFirst({
      select: { id: true },
      where: {
        utilisateurId: Number(user.id),
        OR: [
          { url: k }, { key: k }, { s3Key: k }, { path: k },
          { url: { endsWith: name } },
          { key: { endsWith: name } },
          { s3Key: { endsWith: name } },
          { path: { endsWith: name } },
        ],
      },
    });

    if (!photo) {
      return NextResponse.json(
        { ok: false },
        { status: 404, headers: corsHeaders(origin) }
      );
    }

    return NextResponse.json(
      { ok: true, id: photo.id },
      { status: 200, headers: corsHeaders(origin) }
    );
  } catch (e) {
    console.error("POST /api/photos/resolve-id error:", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
