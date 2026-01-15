// app/api/logout/route.js
import { NextResponse } from "next/server";

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
function getCookieDomainForOrigin(origin) {
  try {
    const { hostname } = new URL(origin);
    if (hostname.endsWith("x-periences.fr")) return ".x-periences.fr";
    return undefined; // localhost / IP → host-only
  } catch {
    return undefined;
  }
}
// 🔧 IMPORTANT : path: "/" (comme pour login)
function cookieBaseOptions(origin) {
  const domain = getCookieDomainForOrigin(origin);
   return {
    secure: true,
    sameSite: "none",
    path: "/", // ✅
    httpOnly: true,
        ...(domain ? { domain } : {}),
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

  const baseOpts = cookieBaseOptions(origin);
  const noDomainOpts = { ...baseOpts };
  delete noDomainOpts.domain;

 // supprime cookie posé "avec domain"
  res.cookies.set("token", "", { ...baseOpts, maxAge: 0 });
  // supprime cookie posé "sans domain" (host-only)
  res.cookies.set("token", "", { ...noDomainOpts, maxAge: 0 });

  return res;
}

export async function DELETE(req) {
  return POST(req);
}
