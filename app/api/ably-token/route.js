// app/api/ably-token/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Ably from "ably";
import jwt from "jsonwebtoken";

/* ---------------- CORS ---------------- */
const ORIGIN_ALLOWLIST = new Set([
  "https://www.x-periences.fr",
  "https://x-periences.fr",
  "https://staging.x-periences.fr",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function pickOrigin(origin) {
  if (!origin) return "https://www.x-periences.fr";
  try {
    const u = new URL(origin);
    return ORIGIN_ALLOWLIST.has(u.origin) ? u.origin : "https://www.x-periences.fr";
  } catch {
    return "https://www.x-periences.fr";
  }
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Requested-With, X-Platform",
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
  const origin = pickOrigin(req.headers.get("origin"));
  const headers = corsHeaders(origin);

  const JWT_SECRET = process.env.JWT_SECRET;
  const ABLY_API_KEY = process.env.ABLY_API_KEY_SERVER;

  if (!JWT_SECRET || !ABLY_API_KEY) {
    return NextResponse.json(
      { error: "Server misconfigured: missing JWT_SECRET or ABLY_API_KEY_SERVER" },
      { status: 500, headers }
    );
  }

  // JWT via Bearer (mobile) ou cookie (web)
  const token = getBearer(req) || getCookieToken(req);
  let user = null;
  try {
    user = jwt.verify(token, JWT_SECRET /* , { issuer: 'xperiences', audience: 'app' } */);
  } catch (e) {
    return NextResponse.json(
      { error: "Unauthorized: invalid or missing token" },
      { status: 401, headers }
    );
  }

  if (!user?.id) {
    return NextResponse.json(
      { error: "Unauthorized: invalid payload" },
      { status: 401, headers }
    );
  }

  try {
    const rest = new Ably.Rest(ABLY_API_KEY);

    // Optionnel : restreindre les droits par channel
    // const cap = {
    //   [`conversation-*`]: ["publish", "subscribe", "presence"],
    //   [`notifications-${user.id}`]: ["subscribe"],
    // };
    // const capability = JSON.stringify(cap);

    const tokenRequest = await rest.auth.createTokenRequest({
      clientId: String(user.id),
      ttl: 60 * 60 * 1000, // 1h
      // capability,
    });

    return NextResponse.json(tokenRequest, { headers });
  } catch (e) {
    console.error("Ably token error:", e);
    return NextResponse.json(
      { error: "Failed to create Ably token" },
      { status: 500, headers }
    );
  }
}
