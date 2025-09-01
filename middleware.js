// middleware.js
import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  "https://www.x-periences.fr",
  "https://x-periences.fr",
  "http://localhost:8081",   // Expo web
  "http://localhost:19006",  // Expo dev
  // ajoute ton LAN si besoin, ex :
  // "http://192.168.1.xx:8081",
];

function corsHeaders(origin) {
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Credentials": "false",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export function middleware(req) {
  const { pathname } = new URL(req.url);
  const origin = req.headers.get("origin") || "";

  // N'applique le CORS que sur les routes /api
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Réponse spéciale pour les préflight OPTIONS
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
  }

  // Pour toutes les autres requêtes API → on ajoute les headers CORS
  const res = NextResponse.next();
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

// Applique ce middleware uniquement sur /api/**
export const config = {
  matcher: ["/api/:path*"],
};
