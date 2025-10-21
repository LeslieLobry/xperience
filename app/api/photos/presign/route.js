// app/api/photos/presign/route.js
import { NextResponse } from "next/server";
import { getPresignedUrl } from "../../../../lib/s3";

export const dynamic = "force-dynamic";

const ALLOWED_ORIGINS = [
  "http://localhost:8081",   // Expo Go (Android)
  "http://localhost:19006",  // Expo web
  "https://www.x-periences.fr",
  "https://x-periences.fr",
];

// Domaine à utiliser si BASE_URL n'est pas défini
const DEFAULT_BASE = "https://www.x-periences.fr";

function pickAllowOrigin(origin = "") {
  // Sur RN l'Origin peut être vide ou "null"
  if (!origin || origin === "null") return DEFAULT_BASE; // évite '*'+credentials
  return ALLOWED_ORIGINS.includes(origin) ? origin : DEFAULT_BASE;
}

function corsHeaders(origin = "") {
  const allowOrigin = pickAllowOrigin(origin);
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
    "Access-Control-Allow-Headers": "Accept, Content-Type, Authorization, X-Platform",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

// ✅ Preflight
export async function OPTIONS(req) {
  const origin = req.headers.get("origin") || "";
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

// ✅ GET (fallback compat): /api/photos/presign?key=...
export async function GET(req) {
  const origin = req.headers.get("origin") || "";
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  if (!key || !String(key).trim()) {
    return NextResponse.json(
      { error: "Paramètre 'key' manquant" },
      { status: 400, headers: corsHeaders(origin) }
    );
  }
  return await handlePresign(String(key).trim(), origin);
}

// ✅ POST (chemin normal)
export async function POST(req) {
  const origin = req.headers.get("origin") || "";
  const body = await req.json().catch(() => ({}));
  const { key } = body || {};
  if (!key || !String(key).trim()) {
    return NextResponse.json(
      { error: "Paramètre 'key' manquant" },
      { status: 400, headers: corsHeaders(origin) }
    );
  }
  return await handlePresign(String(key).trim(), origin);
}

// --- Implémentation commune ---
async function handlePresign(raw, origin) {
  try {
    // 1) Déjà une URL http(s) -> renvoyer telle quelle
    if (/^https?:\/\//i.test(raw)) {
      return NextResponse.json({ url: raw }, { status: 200, headers: corsHeaders(origin) });
    }

    // 2) Chemin local /uploads/* -> URL absolue
    if (raw.startsWith("/uploads/") || raw.startsWith("uploads/")) {
      const rel = raw.startsWith("/") ? raw : `/${raw}`;
      const BASE =
        process.env.NEXT_PUBLIC_BASE_URL ||
        process.env.BASE_URL ||
        DEFAULT_BASE; // 🔑 fallback absolu pour RN
      const abs = `${BASE}${rel}`;
      return NextResponse.json({ url: abs }, { status: 200, headers: corsHeaders(origin) });
    }

    // 3) Clé S3 -> presign
    const cleanKey = raw.replace(/^\/+/, "");
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
