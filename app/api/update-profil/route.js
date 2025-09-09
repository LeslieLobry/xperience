// app/api/update-profil/route.js
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { headers as getHeaders, cookies as getCookies } from "next/headers";
import { prisma } from "../../../lib/prisma"; // ← si tu n'as pas ce fichier, remets new PrismaClient()
import { isProfilComplet } from "../../../lib/isProfilComplet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET non défini");

// --- CORS ---
const ALLOWED_ORIGINS = [
  "http://localhost:8081",  // Expo web
  "http://localhost:19006", // Expo dev
  "https://www.x-periences.fr",
  "https://x-periences.fr",
];

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
  const origin = (await getHeaders()).get("origin") || "";
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

// --- Helpers ---
function extractToken(reqHeaders) {
  // 1) Authorization: Bearer ...
  const auth = reqHeaders.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m?.[1]) return m[1];

  // 2) Cookie "token" via next/headers cookies()
  try {
    const c = getCookies().get("token")?.value;
    if (c) return c;
  } catch {}

  // 3) Cookie header brut en fallback
  const cookieHeader = reqHeaders.get("cookie") || "";
  const tokenPair = cookieHeader.split(/;\s*/).find((x) => x.startsWith("token="));
  if (tokenPair) return decodeURIComponent(tokenPair.split("=")[1]);

  return null;
}

function toNumberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function buildUpdateData(body = {}) {
  // Champs autorisés
  const base = {
    localisation: body.localisation,
    experience: body.experience,
    rechercheType: body.rechercheType,
    type: body.type,
    age: toNumberOrNull(body.age),
    fumeur: body.fumeur,
    silhouette: body.silhouette,
    taille: toNumberOrNull(body.taille),
    origines: body.origines,
    yeux: body.yeux,
    cheveux: body.cheveux,
    description: body.description,
  };

  // Champs 2e membre si couple
  const isCouple = String(body.type || "").trim().toLowerCase() === "couple";
  if (isCouple) {
    Object.assign(base, {
      age2: toNumberOrNull(body.age2),
      dateNaissance2: body.dateNaissance2 ? new Date(body.dateNaissance2) : null,
      fumeur2: body.fumeur2,
      silhouette2: body.silhouette2,
      taille2: toNumberOrNull(body.taille2),
      origines2: body.origines2,
      yeux2: body.yeux2,
      cheveux2: body.cheveux2,
      description2: body.description2,
    });
  }

  // Nettoyage: on garde uniquement valeurs définies/non vides
  const data = {};
  for (const [k, v] of Object.entries(base)) {
    if (
      v !== undefined &&
      v !== "" &&
      v !== null &&
      !(typeof v === "number" && Number.isNaN(v))
    ) {
      data[k] = v;
    }
  }
  return data;
}

export async function POST(req) {
  const reqHeaders = await getHeaders();
  const origin = reqHeaders.get("origin") || "";
  const headers = corsHeaders(origin);

  // --- Auth (JSON 401/403, pas de redirect) ---
  const token = extractToken(reqHeaders);
  if (!token) {
    return NextResponse.json({ success: false, message: "Non authentifié." }, { status: 401, headers });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return NextResponse.json({ success: false, message: "Token invalide." }, { status: 403, headers });
  }
  const userId = Number(decoded.id || decoded.sub);
  if (!userId) {
    return NextResponse.json({ success: false, message: "Token invalide." }, { status: 403, headers });
  }

  // --- Body ---
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "JSON invalide." }, { status: 400, headers });
  }

  const data = buildUpdateData(body);
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ success: false, message: "Aucun champ à mettre à jour." }, { status: 400, headers });
  }

  try {
    // 1) Update profil
    const updatedUser = await prisma.utilisateur.update({
      where: { id: userId },
      data,
    });

    // 2) Profil complet ?
    const profilComplet = isProfilComplet(updatedUser);

    // 3) M-à-j du flag si besoin
    if (updatedUser.profilComplet !== profilComplet) {
      await prisma.utilisateur.update({
        where: { id: updatedUser.id },
        data: { profilComplet },
      });
    }

    // 4) Retour
    return NextResponse.json(
      { success: true, user: { ...updatedUser, profilComplet } },
      { headers }
    );
  } catch (err) {
    console.error("❌ update-profil:", err?.message || err);
    return NextResponse.json({ success: false, message: "Erreur serveur." }, { status: 500, headers });
  }
}
