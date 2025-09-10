// app/api/photos/presign/route.js
import { NextResponse } from "next/server";
import { getPresignedUrl } from "../../../../lib/s3";

export const dynamic = "force-dynamic";

const ALLOWED_ORIGINS = [
  "http://localhost:8081",   // Expo Go
  "http://localhost:19006",  // Expo web
  "https://www.x-periences.fr",
  "https://x-periences.fr",
];

// ⚠️ Si l'app RN n'envoie pas d'Origin mais qu'on utilise des cookies/Authorization,
// on ne peut pas renvoyer '*' avec Access-Control-Allow-Credentials.
// On force alors notre domaine de prod.
function corsHeaders(origin = "") {
  const fallback = "https://www.x-periences.fr";
  const allowOrigin = origin ? (ALLOWED_ORIGINS.includes(origin) ? origin : fallback) : fallback;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Platform",
    "Access-Control-Max-Age": "86400",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

// ✅ Répondre au preflight CORS pour éviter les 405 côté mobile
export async function OPTIONS(req) {
  const origin = req.headers.get("origin") || "";
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(req) {
  const origin = req.headers.get("origin") || "";
  try {
    const body = await req.json().catch(() => ({}));
    let { key } = body || {};

    if (!key || !String(key).trim()) {
      return NextResponse.json(
        { error: "Paramètre 'key' manquant" },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const cleanKey = String(key).trim().replace(/^\/+/, "");

    // 🔑 IMPORTANT : ton lib/s3 a la signature (key, expiresIn)
    // NE PAS passer un objet { operation } en second argument ici.
    const url = await getPresignedUrl(cleanKey);

    if (!url) {
      return NextResponse.json(
        { error: "Échec de signature" },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    return NextResponse.json({ url }, { status: 200, headers: corsHeaders(origin) });
  } catch (e) {
    console.error("Presign error:", e);
    return NextResponse.json(
      { error: "Erreur signature URL" },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
