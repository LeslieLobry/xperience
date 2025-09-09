// app/api/photos/presign/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { getPresignedUrl } from "../../../../lib/s3";

// --- CONFIG
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) console.warn("[presign] JWT_SECRET manquant (auth Bearer/cookie possible mais non vérifiable)");

const ALLOWED_ORIGINS = [
  "http://localhost:8081",   // ton web local
  "http://localhost:3000",   // si tu as un front web local
  "http://localhost:19006",  // Expo devtools
  "exp://127.0.0.1:19000",   // Expo
  "https://www.x-periences.fr",
  "https://x-periences.fr",
];

// Mets à false si tu veux autoriser la présignature publique (déconseillé pour des avatars privés)
const REQUIRE_AUTH = true;

// --- Helpers CORS
function corsHeaders(origin = "") {
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "https://www.x-periences.fr";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Platform, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(req) {
  const origin = req.headers.get("origin") || "";
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

// --- Auth (cookie OU Bearer)
async function getUserIdFromRequest(req) {
  // 1) Cookie
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (token && JWT_SECRET) {
      const payload = jwt.verify(token, JWT_SECRET);
      if (payload?.id) return Number(payload.id);
    }
  } catch (e) {}

  // 2) Authorization: Bearer
  try {
    const auth = req.headers.get("authorization") || "";
    if (auth.startsWith("Bearer ") && JWT_SECRET) {
      const token = auth.slice(7);
      const payload = jwt.verify(token, JWT_SECRET);
      if (payload?.id) return Number(payload.id);
    }
  } catch (e) {}

  return null;
}

// --- Normalisation & validation de la clé S3
function normalizeKey(input) {
  if (!input || typeof input !== "string") return null;
  let key = input.trim();

  // Si c'est une URL (S3 / CloudFront), extraire la clé
  if (/^https?:\/\//i.test(key)) {
    const m = key.match(/https?:\/\/[^/]+\/([^?]+)/);
    key = m?.[1] ? decodeURIComponent(m[1]) : "";
  }

  // remove leading slashes
  key = key.replace(/^\/+/, "");

  // refuser trucs bizarres
  if (!key || key.includes("..")) return null;
  // optionnel : restreindre aux dossiers attendus
  // if (!/^users\/\d+\/.+/.test(key) && !/^photos\/.+/.test(key)) return null;

  return key;
}

export async function POST(req) {
  const origin = req.headers.get("origin") || "";
  const headers = {
    ...corsHeaders(origin),
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
  };

  try {
    const body = await req.json().catch(() => ({}));
    const rawKey = body?.key;
    const key = normalizeKey(rawKey);

    if (!key) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[presign] key invalide:", rawKey);
      }
      return NextResponse.json({ error: "Clé invalide" }, { status: 400, headers });
    }

    // Auth (si exigée)
    if (REQUIRE_AUTH) {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers });
      }

      // 🔒 Bonus (recommandé) : contrôle d'accès sur la clé
      // Exemple: autoriser seulement si la clé appartient à l'utilisateur ou est publique
      // if (!key.startsWith(`users/${userId}/`) && !key.startsWith("public/")) {
      //   return NextResponse.json({ error: "Accès interdit" }, { status: 403, headers });
      // }
    }

    // Génère l'URL présignée
    const url = await getPresignedUrl(key);
    if (!url) {
      return NextResponse.json({ error: "Impossible de présigner" }, { status: 500, headers });
    }

    // Anti-cache côté client (utile si renouvellement fréquent)
    const urlWithTs = (() => {
      try {
        const u = new URL(url);
        u.searchParams.set("_", Date.now().toString());
        return u.toString();
      } catch {
        return url;
      }
    })();

    return NextResponse.json({ url: urlWithTs }, { status: 200, headers });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("❌ [presign] erreur:", e);
    }
    return NextResponse.json(
      { error: "Erreur signature URL" },
      { status: 500, headers }
    );
  }
}
