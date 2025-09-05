// middleware.js
import { NextResponse } from "next/server";

const PROD_ORIGINS = [
  "https://www.x-periences.fr",
  "https://x-periences.fr",
];

// Active/désactive les origins dev même en prod via l'env
const ALLOW_DEV_ORIGINS = process.env.ALLOW_DEV_ORIGINS !== "false";

// ⚠ Liste dev/LAN à adapter à ton réseau
const DEV_ORIGINS_ALWAYS_ALLOWED = [
  "http://localhost:",
  "http://127.0.0.1:",
  "http://192.168.",   // Expo LAN / device
  "http://10.0.2.2:",  // Android emulator
  "http://localhost:8081",
  "http://localhost:19006",
  "http://127.0.0.1:19006",
  "http://127.0.0.1:8081",
];

function isAllowedDevOrigin(origin) {
  if (!ALLOW_DEV_ORIGINS) return false;
  return DEV_ORIGINS_ALWAYS_ALLOWED.some((p) => origin?.startsWith(p));
}

function pickAllowOrigin(origin) {
  if (!origin) return null; // No-CORS/native fetch: pas besoin d'Allow-Origin
  if (isAllowedDevOrigin(origin)) return origin;
  if (PROD_ORIGINS.includes(origin)) return origin;
  return PROD_ORIGINS[0];
}

function makeHeaders(req, { allowCreds = true } = {}) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = pickAllowOrigin(origin);

  // Reflète les headers demandés en pré-vol (plus robuste que liste figée)
  const acrh = req.headers.get("access-control-request-headers");
  const requestedMethods = req.headers.get("access-control-request-method");
  const wantsPrivateNet = req.headers.get("access-control-request-private-network") === "true";

  const h = new Headers();

  if (allowOrigin) {
    h.set("Access-Control-Allow-Origin", allowOrigin);
    h.set("Vary", "Origin");
  }
  h.set("Access-Control-Allow-Methods", requestedMethods || "GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD");
  h.set("Access-Control-Allow-Headers", acrh || [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "X-Platform",
    "x-platform",
    "X-Action",
    "x-action",
    "X-Client",
    "x-client",
  ].join(", "));
  if (allowCreds && allowOrigin) h.set("Access-Control-Allow-Credentials", "true");
  if (wantsPrivateNet) h.set("Access-Control-Allow-Private-Network", "true");
  h.set("Access-Control-Max-Age", "86400");
  return h;
}

export function middleware(req) {
  // Réponse immédiate aux pré-vols
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: makeHeaders(req) });
  }

  const res = NextResponse.next();
  const h = makeHeaders(req);
  h.forEach((v, k) => res.headers.set(k, v));
  return res;
}

export const config = {
  matcher: ["/api/:path*"],
};
