// app/api/photos/presign/route.js
import { NextResponse } from "next/server";
import { getPresignedUrl } from "../../../../lib/s3";

const ALLOWED_ORIGINS = [
  "http://localhost:8081",   // Expo Go
  "http://localhost:19006",  // Expo web
  "https://www.x-periences.fr",
  "https://x-periences.fr",
];

function corsHeaders(origin = "") {
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "https://www.x-periences.fr";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Platform",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

// ✅ Répond au preflight (évite le 405 côté RN/Expo)
export async function OPTIONS(req) {
  const origin = req.headers.get("origin") || "";
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(req) {
  const origin = req.headers.get("origin") || "";
  try {
    let body = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "JSON invalide" },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    let { key, operation = "get" } = body || {};
    if (typeof key !== "string" || !key.trim()) {
      return NextResponse.json(
        { error: "Paramètre 'key' manquant" },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // Nettoyage: retire les / initiaux, espaces, etc.
    key = key.trim().replace(/^\/+/, "");

    // (Optionnel mais recommandé) vérifier ici les droits d’accès à la ressource

    const url = await getPresignedUrl(key, { operation }); // ton util peut ignorer 'operation' si non géré
    if (!url) {
      return NextResponse.json(
        { error: "Échec de signature" },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    return NextResponse.json({ url }, { status: 200, headers: corsHeaders(origin) });
  } catch (e) {
    return NextResponse.json(
      { error: "Erreur signature URL" },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
