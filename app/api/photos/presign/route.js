// app/api/photos/presign/route.js
import { NextResponse } from "next/server";
import { getPresignedUrl } from "../../../../lib/s3";

// éviter tout cache côté edge sur une URL signée
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

// Préflight
export async function OPTIONS(req) {
  const origin = req.headers.get("origin") || "";
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

// POST /api/photos/presign  { key: "galeries/u42/file.jpg" | "/uploads/xxx.jpg" | "https://..." }
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

    const raw = String(key).trim();

    // 1) Déjà une URL absolue -> renvoyer telle quelle
    if (/^https?:\/\//i.test(raw)) {
      return NextResponse.json({ url: raw }, { status: 200, headers: corsHeaders(origin) });
    }

    // 2) Chemin local /uploads/* -> renvoyer une URL absolue du site
    if (raw.startsWith("/uploads/") || raw.startsWith("uploads/")) {
      const rel = raw.startsWith("/") ? raw : `/${raw}`;
      const abs = `https://www.x-periences.fr${rel}`;
      return NextResponse.json({ url: abs }, { status: 200, headers: corsHeaders(origin) });
    }

    // 3) Clé S3 -> présigner
    const cleanKey = raw.replace(/^\/+/, "");
    const url = await getPresignedUrl(cleanKey);
    if (!url) {
      return NextResponse.json(
        { error: "Impossible de générer l'URL signée" },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    return NextResponse.json({ url }, { status: 200, headers: corsHeaders(origin) });
  } catch (e) {
    console.error("Presign error:", e);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
