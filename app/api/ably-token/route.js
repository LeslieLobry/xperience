// app/api/ably-token/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Ably from "ably";
import jwt from "jsonwebtoken";

// Utils
function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "https://www.x-periences.fr",
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Requested-With, X-Platform",
    "Cache-Control": "no-store",
  };
}
const getBearer = (req) => {
  const a = req.headers.get("authorization") || "";
  return a.startsWith("Bearer ") ? a.slice(7) : "";
};
const getCookieToken = (req) => {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
};

export async function OPTIONS(req) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function GET(req) {
  const origin = req.headers.get("origin");
  const JWT_SECRET = process.env.JWT_SECRET;
  const ABLY_API_KEY = process.env.ABLY_API_KEY_SERVER; // <-- ton nom d'env

  if (!JWT_SECRET || !ABLY_API_KEY) {
    return NextResponse.json(
      { error: "Server misconfigured: missing JWT_SECRET or ABLY_API_KEY_SERVER" },
      { status: 500, headers: corsHeaders(origin) }
    );
  }

  // Récup token (Bearer pour mobile, cookie pour web)
  const token = getBearer(req) || getCookieToken(req);
  let user = null;
  try { user = jwt.verify(token, JWT_SECRET); } catch {}

  if (!user?.id) {
    return NextResponse.json(
      { error: "Unauthorized: invalid or missing token" },
      { status: 401, headers: corsHeaders(origin) }
    );
  }

  // Crée le TokenRequest Ably
  const rest = new Ably.Rest(ABLY_API_KEY);
  const tokenRequest = await rest.auth.createTokenRequest({
    clientId: String(user.id),
    ttl: 60 * 60 * 1000,
    // capability (optionnelle)
    // capability: JSON.stringify({ [`conversation-*`]: ["publish","subscribe"], [`notifications-${user.id}`]: ["subscribe"] }),
  });

  return NextResponse.json(tokenRequest, { headers: corsHeaders(origin) });
}
