// app/api/logout/route.js
import { NextResponse } from "next/server";

export const runtime = "nodejs";

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
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Platform, x-platform, X-Requested-With, Accept, Origin",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(req) {
  const origin = req.headers.get("origin") || "";
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

function buildCookieDeleteOptions({ isProd, domain }) {
  return {
    httpOnly: true,
    secure: isProd, // ✅ prod only
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: 0,
    ...(domain ? { domain } : {}),
  };
}

export async function POST(req) {
  const origin = req.headers.get("origin") || "";
  const headers = corsHeaders(origin);

  const isProd = process.env.NODE_ENV === "production";

  const res = NextResponse.json({ success: true }, { headers });

  // 1) Supprime cookie host-only
  res.cookies.set("token", "", buildCookieDeleteOptions({ isProd, domain: undefined }));

  // 2) Supprime cookie domain-wide (prod) => couvre x-periences.fr + www
  if (isProd) {
    res.cookies.set("token", "", buildCookieDeleteOptions({ isProd, domain: ".x-periences.fr" }));
  }

  return res;
}

export async function DELETE(req) {
  return POST(req);
}
