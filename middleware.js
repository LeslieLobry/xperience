// middleware.js
import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  "https://www.x-periences.fr",
  "https://x-periences.fr",
  "http://localhost:8081",   // Expo web
  "http://localhost:19006",  // Expo dev
  // "http://192.168.1.15:8081", // ← remets ton IP LAN exacte si besoin
];

function makeHeaders(origin, { allowCreds = false } = {}) {
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",

    // Ajoute TOUT ce que tu envoies côté client (mets les deux variantes au besoin)
    "Access-Control-Allow-Headers": [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "X-Platform", "x-platform",
      "X-Action",   "x-action",
      "X-Client",   "x-client",
    ].join(", "),

    "Access-Control-Allow-Credentials": allowCreds ? "true" : "false",
    "Access-Control-Expose-Headers": "Content-Length, Content-Type",
  };
}

export function middleware(req) {
  const { pathname } = new URL(req.url);
  const origin = req.headers.get("origin") || "";

  // On ne touche qu'aux routes API
  if (!pathname.startsWith("/api/")) return NextResponse.next();

  // Endpoints qui utilisent des cookies → credentials true
  const needsCreds = pathname.startsWith("/api/login") || pathname.startsWith("/api/me");

  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: makeHeaders(origin, { allowCreds: needsCreds }),
    });
  }

  const res = NextResponse.next();
  const headers = makeHeaders(origin, { allowCreds: needsCreds });
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export const config = {
  matcher: ["/api/:path*"],
};
