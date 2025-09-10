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

function corsHeaders(origin = "") {
  const allowOrigin = origin
    ? (ALLOWED_ORIGINS.includes(origin) ? origin : "https://www.x-periences.fr")
    : "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Platform",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

// Réponse au preflight CORS
export async function OPTIONS(req) {
  const origin = req.headers.get("origin") || "";
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(req) {
  const origin = req.headers.get("origin") || "";
  try {
    const { key, operation = "get" } = await req.json();

    if (!key) {
      return NextResponse.json(
        { error: "Paramètre 'key' manquant" },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const cleanKey = String(key).trim().replace(/^\/+/, "");

    const url = await getPresignedUrl(cleanKey, { operation });
    return NextResponse.json({ url }, { status: 200, headers: corsHeaders(origin) });
  } catch (e) {
    console.error("Presign error:", e);
    return NextResponse.json(
      { error: "Erreur signature URL" },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
