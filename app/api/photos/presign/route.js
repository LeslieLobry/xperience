// app/api/photos/presign/route.js
import { NextResponse } from "next/server";
import { getPresignedUrl } from "../../../../lib/s3";

// pour éviter tout cache côté edge sur une URL signée
export const dynamic = "force-dynamic";

const ALLOWED_ORIGINS = [
  "http://localhost:8081",   // Expo Go (Android)
  "http://localhost:19006",  // Expo web
  "https://www.x-periences.fr",
  "https://x-periences.fr",
];

function corsHeaders(origin = "") {
  // Sur RN, Origin peut être vide : on autorise "*"
  const allowOrigin = origin
    ? (ALLOWED_ORIGINS.includes(origin) ? origin : "https://www.x-periences.fr")
    : "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Platform",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

// ✅ répond au preflight pour éviter le 405
export async function OPTIONS(req) {
  const origin = req.headers.get("origin") || "";
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(req) {
  const origin = req.headers.get("origin") || "";
  try {
    const body = await req.json().catch(() => ({}));
    const { key } = body || {};

    if (!key || !String(key).trim()) {
      return NextResponse.json(
        { error: "Paramètre 'key' manquant" },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const cleanKey = String(key).trim().replace(/^\/+/, "");

    // (Optionnel) vérifier ici que l'utilisateur peut accéder à cette ressource

    const url = await getPresignedUrl(cleanKey); // GET presign
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
