// middleware.js
import { NextResponse } from "next/server";

const PROD_ORIGINS = [
  "https://www.x-periences.fr",
  "https://x-periences.fr",
];

const DEV_WHITELIST_PREFIXES = [
  "http://localhost:",
  "http://127.0.0.1:",
  "http://192.168.",   // Expo LAN
];

function pickAllowOrigin(origin) {
  const isProd = process.env.NODE_ENV === "production";

  if (!origin) {
    // Pas d'Origin -> requêtes non-CORS (ex: React Native natif) : on met le site
    return PROD_ORIGINS[0];
  }

  if (isProd) {
    // Prod: seulement la liste blanche stricte
    if (PROD_ORIGINS.includes(origin)) return origin;
    return PROD_ORIGINS[0];
  }

  // Dev: accepte localhost / LAN (Expo web/LAN)
  if (DEV_WHITELIST_PREFIXES.some((p) => origin.startsWith(p))) {
    return origin;
  }

  // Sinon, retombe sur le premier domaine prod (évite *)
  return PROD_ORIGINS[0];
}

function makeHeaders(origin, { allowCreds = true } = {}) {
  const allowOrigin = pickAllowOrigin(origin);
  const h = new Headers();
  h.set("Access-Control-Allow-Origin", allowOrigin);
  h.set("Vary", "Origin");
  h.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  h.set(
    "Access-Control-Allow-Headers",
    [
      "Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin",
      "X-Platform", "x-platform", "X-Action", "x-action", "X-Client", "x-client",
    ].join(", ")
  );
  if (allowCreds) h.set("Access-Control-Allow-Credentials", "true");
  h.set("Access-Control-Max-Age", "86400");
  return h;
}

export function middleware(req) {
  const origin = req.headers.get("origin") || "";

  // Préflight
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: makeHeaders(origin) });
  }

  // Réponses normales
  const res = NextResponse.next();
  const h = makeHeaders(origin);
  h.forEach((v, k) => res.headers.set(k, v));
  return res;
}

// N'applique qu'aux routes API
export const config = {
  matcher: ["/api/:path*"],
};
