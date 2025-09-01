// middleware.js
import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  "https://www.x-periences.fr",
  "https://x-periences.fr",
  "http://localhost:8081",   // Expo web
  "http://localhost:19006",  // Expo dev
   "http://192.168.1.xx:8081", // LAN si besoin
];

function makeHeaders(origin, { allowCreds = false } = {}) {
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    // Origin
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",

    // Méthodes
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",

    // ⚠️ Autorise les headers custom envoyés par ton client (x-platform, etc.)
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With, x-platform, x-action, x-client, Accept, Origin",

    // Cookies cross-site (uniquement si nécessaire)
    "Access-Control-Allow-Credentials": allowCreds ? "true" : "false",

    // (optionnel) exposer certains headers
    "Access-Control-Expose-Headers": "Content-Length, Content-Type",
  };
}

export function middleware(req) {
  const url = new URL(req.url);
  const { pathname } = url;
  const origin = req.headers.get("origin") || "";

  // On ne touche qu'aux routes API
  if (!pathname.startsWith("/api/")) return NextResponse.next();

  // Endpoints qui utilisent des cookies (me/login) → credentials = true
  const needsCreds = pathname.startsWith("/api/login") || pathname.startsWith("/api/me");

  // Préflight
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: makeHeaders(origin, { allowCreds: needsCreds }),
    });
  }

  // Réponses normales → injecter CORS
  const res = NextResponse.next();
  const headers = makeHeaders(origin, { allowCreds: needsCreds });
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

// Cible uniquement /api/**
export const config = {
  matcher: ["/api/:path*"],
};
