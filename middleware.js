// middleware.js
import { NextResponse } from "next/server";

const PROD_ORIGINS = [
  "https://www.x-periences.fr",
  "https://x-periences.fr",
];

// ⚠ Ajoute ici tes origins Expo exacts (web/dev/LAN)
const DEV_ORIGINS_ALWAYS_ALLOWED = [
  "http://localhost:8081",
  "http://localhost:19006",
  "http://127.0.0.1:19006",
  "http://127.0.0.1:8081",
  "http://192.168.",   // prefix matching
  "http://10.0.2.2:",  // émulateur Android
];

function isAllowedDevOrigin(origin) {
  return DEV_ORIGINS_ALWAYS_ALLOWED.some(p => origin.startsWith(p));
}

function pickAllowOrigin(origin) {
  if (!origin) {
    // Pas d'Origin -> requêtes non-CORS (React Native natif)
    return PROD_ORIGINS[0];
  }
  // 1) Autorise explicitement les origins dev (même en prod)
  if (isAllowedDevOrigin(origin)) return origin;

  // 2) Sinon, prod stricte
  if (PROD_ORIGINS.includes(origin)) return origin;
  return PROD_ORIGINS[0];
}

function makeHeaders(origin, { allowCreds = true } = {}) {
  const allowOrigin = pickAllowOrigin(origin);
  const h = new Headers();
  h.set("Access-Control-Allow-Origin", allowOrigin);
  h.set("Vary", "Origin");
  h.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  h.set("Access-Control-Allow-Headers", [
    "Content-Type","Authorization","X-Requested-With","Accept","Origin",
    "X-Platform","x-platform","X-Action","x-action","X-Client","x-client",
  ].join(", "));
  if (allowCreds) h.set("Access-Control-Allow-Credentials", "true");
  h.set("Access-Control-Max-Age", "86400");
  return h;
}

export function middleware(req) {
  const origin = req.headers.get("origin") || "";

  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: makeHeaders(origin) });
  }

  const res = NextResponse.next();
  const h = makeHeaders(origin);
  h.forEach((v, k) => res.headers.set(k, v));
  return res;
}

export const config = {
  matcher: ["/api/:path*"],
};
