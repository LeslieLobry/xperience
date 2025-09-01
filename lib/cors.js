// app/lib/cors.js
import { NextResponse } from "next/server";

// 🔹 Liste des origines autorisées (ajoute ton LAN si besoin)
const ALLOWED_ORIGINS = [
  "https://www.x-periences.fr",
  "https://x-periences.fr",
  "http://localhost:8081",   // Expo web
  "http://localhost:19006",  // Expo dev
  "http://192.168.1.15:8081" // ton LAN mobile
];

export function corsHeaders(req, extra = {}) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Credentials": "false",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    ...extra,
  };
}

// Réponse JSON ok
export function okJSON(req, body, init = {}) {
  return NextResponse.json(body, {
    ...init,
    headers: { ...corsHeaders(req), ...(init.headers || {}) },
  });
}

// Réponse JSON erreur
export function errorJSON(req, body, status = 400, init = {}) {
  return NextResponse.json(body, {
    status,
    headers: { ...corsHeaders(req), ...(init.headers || {}) },
  });
}

// Réponse OPTIONS (préflight)
export function preflight(req) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req),
  });
}
