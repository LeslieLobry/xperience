// app/api/ably-token/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Ably from "ably";
import jwt from "jsonwebtoken";

/* ---------------- CORS ---------------- */
const ORIGIN_ALLOWLIST = [
  "https://www.x-periences.fr",
  "https://x-periences.fr",
  "https://staging.x-periences.fr",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8081",  // 🆕 Expo web
  "http://localhost:19006", // 🆕 Expo dev (si tu l’utilises)
];

function pickOrigin(originHeader) {
  if (!originHeader) return "https://www.x-periences.fr";
  try {
    const u = new URL(originHeader);
    const origin = u.origin;
    if (ORIGIN_ALLOWLIST.includes(origin)) return origin;
    return "https://www.x-periences.fr";
  } catch {
    return "https://www.x-periences.fr";
  }
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, X-Requested-With, X-Platform",
    "Access-Control-Max-Age": "600",
    "Cache-Control": "no-store",
  };
}

/* ---------------- Auth helpers ---------------- */
const getBearer = (req) => {
  const a = req.headers.get("authorization") || "";
  return a.startsWith("Bearer ") ? a.slice(7) : "";
};

const getCookieToken = (req) => {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
};

/* ---------------- Handlers ---------------- */
export async function OPTIONS(req) {
  const origin = pickOrigin(req.headers.get("origin"));
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function GET(req) {
  const originHeader = req.headers.get("origin");
  const origin = pickOrigin(originHeader);
  const headers = corsHeaders(origin);

  console.log("[/api/ably-token] origin =", originHeader, "→ used =", origin);

  const JWT_SECRET = process.env.JWT_SECRET;
  const ABLY_API_KEY = process.env.ABLY_API_KEY_SERVER;

  if (!JWT_SECRET || !ABLY_API_KEY) {
    console.error(
      "[/api/ably-token] missing env",
      { hasJWT: !!JWT_SECRET, hasAbly: !!ABLY_API_KEY }
    );
    return NextResponse.json(
      { error: "Server misconfigured: missing JWT_SECRET or ABLY_API_KEY_SERVER" },
      { status: 500, headers }
    );
  }

  // JWT via Bearer (mobile) ou cookie (web)
  const token = getBearer(req) || getCookieToken(req);
  let user = null;
  try {
    user = jwt.verify(token, JWT_SECRET);
  } catch (e) {
    console.warn("[/api/ably-token] invalid token:", e?.message || e);
    return NextResponse.json(
      { error: "Unauthorized: invalid or missing token" },
      { status: 401, headers }
    );
  }

  if (!user?.id) {
    console.warn("[/api/ably-token] payload without id");
    return NextResponse.json(
      { error: "Unauthorized: invalid payload" },
      { status: 401, headers }
    );
  }

  try {
    const rest = new Ably.Rest(ABLY_API_KEY);

    const tokenRequest = await rest.auth.createTokenRequest({
      clientId: String(user.id),
      ttl: 60 * 60 * 1000, // 1h
    });

    console.log("[/api/ably-token] tokenRequest OK for user", user.id);
    return NextResponse.json(tokenRequest, { headers });
  } catch (e) {
    console.error("[/api/ably-token] Ably token error:", e);
    return NextResponse.json(
      { error: "Failed to create Ably token" },
      { status: 500, headers }
    );
  }
}
