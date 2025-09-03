// app/lib/cors.js
import { NextResponse } from "next/server";

const PROD_ORIGINS = [
  "https://www.x-periences.fr",
  "https://x-periences.fr",
];
const DEV_ORIGINS_ALWAYS_ALLOWED = [
  "http://localhost:8081",
  "http://localhost:19006",
  "http://127.0.0.1:19006",
  "http://127.0.0.1:8081",
  "http://192.168.",   // prefix matching
  "http://10.0.2.2:",
];

function isAllowedDevOrigin(origin="") {
  return DEV_ORIGINS_ALWAYS_ALLOWED.some(p => origin.startsWith(p));
}

function pickAllowOrigin(origin = "") {
  if (!origin) return PROD_ORIGINS[0];
  if (isAllowedDevOrigin(origin)) return origin;
  if (PROD_ORIGINS.includes(origin)) return origin;
  return PROD_ORIGINS[0];
}

function corsHeadersInternal(req, extra = {}) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = pickAllowOrigin(origin);
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": [
      "Content-Type","Authorization","X-Requested-With","Accept","Origin",
      "X-Platform","x-platform","X-Action","x-action","X-Client","x-client",
    ].join(", "),
    "Access-Control-Max-Age": "86400",
    ...extra,
  };
}

export function okJSON(req, body, init = {}) {
  return NextResponse.json(body, {
    ...init,
    headers: { ...corsHeadersInternal(req), ...(init.headers || {}) },
  });
}
export function errorJSON(req, body, status = 400, init = {}) {
  return NextResponse.json(body, {
    status,
    headers: { ...corsHeadersInternal(req), ...(init.headers || {}) },
  });
}
export function preflight(req) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeadersInternal(req),
  });
}
