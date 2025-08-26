// app/api/me/route.js
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "../../../lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET non défini");

// ---- CORS ----
const ALLOWED_ORIGINS = [
  "http://localhost:8081",   // Expo web
  "http://localhost:19006",  // Expo dev
  "https://www.x-periences.fr",
  "https://x-periences.fr",  // OK si pas de redirection sur /api
];
function corsHeaders(origin = "") {
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "https://www.x-periences.fr";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Platform",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
export async function OPTIONS(req) {
  const origin = req.headers.get("origin") || "";
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

// ---- Auth helpers: Authorization: Bearer ... OU cookie token=... ----
function extractTokenFromReq(req) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m?.[1]) return m[1];

  const cookie = req.headers.get("cookie") || "";
  const c = cookie.split(/;\s*/).find((x) => x.startsWith("token="));
  if (c) return c.split("=")[1];

  return null;
}

export async function GET(req) {
  const origin = req.headers.get("origin") || "";
  const headers = corsHeaders(origin);

  // 1) Récup token
  const token = extractTokenFromReq(req);
  if (!token) {
    return NextResponse.json({ success: false, message: "Non authentifié." }, { status: 401, headers });
  }

  // 2) Vérif JWT
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return NextResponse.json({ success: false, message: "Token invalide." }, { status: 401, headers });
  }

  const userId = Number(decoded.id || decoded.sub);
  if (!userId) {
    return NextResponse.json({ success: false, message: "Token invalide." }, { status: 401, headers });
  }

  try {
    // 3) Charge l'utilisateur (même shape que ton code actuel)
    const user = await prisma.utilisateur.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        type: true,
        role: true,
        pseudo: true,
        photoUrl: true,
        age: true,
        description: true,
        localisation: true,
        experience: true,
        rechercheType: true,
        sexe: true,
        fumeur: true,
        silhouette: true,
        taille: true,
        origines: true,
        yeux: true,
        cheveux: true,
        createdAt: true,
        lastLogin: true,
        verificationDeadline: true,
        verificationIdentite: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "Utilisateur introuvable." }, { status: 401, headers });
    }

    return NextResponse.json({ success: true, user }, { headers });
  } catch (err) {
    console.error("❌ Erreur API /me :", err?.message || err);
    return NextResponse.json(
      { success: false, message: "Erreur serveur ou token invalide." },
      { status: 500, headers }
    );
  }
}
