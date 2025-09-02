// middleware.js
import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  "https://www.x-periences.fr",
  "https://x-periences.fr",
  "http://localhost:8081",
  "http://localhost:19006",
  // "http://192.168.1.15:8081",
];

function makeHeaders(origin, { allowCreds = true } = {}) {
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  const h = new Headers();
  h.set("Access-Control-Allow-Origin", allowOrigin);
  h.set("Vary", "Origin");
  h.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  h.set("Access-Control-Allow-Headers",
    [
      "Content-Type","Authorization","X-Requested-With","Accept","Origin",
      "X-Platform","x-platform","X-Action","x-action","X-Client","x-client"
    ].join(", ")
  );
  if (allowCreds) h.set("Access-Control-Allow-Credentials", "true");
  h.set("Access-Control-Max-Age", "86400");
  return h;
}

export function middleware(req) {
  const origin = req.headers.get("origin") || "";
  const url = new URL(req.url);
  const pathname = url.pathname;

  // si tu veux exclure certains chemins, fais-le ici

  // Répondre immédiatement aux préflights
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: makeHeaders(origin) });
  }

  // Ajouter les en-têtes CORS aux autres réponses
  const res = NextResponse.next();
  const h = makeHeaders(origin);
  h.forEach((v, k) => res.headers.set(k, v));
  return res;
}

// Appliquer partout sauf assets/statics
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map)).*)",
  ],
};
