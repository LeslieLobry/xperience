// app/api/update-profil/route.js
import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------------------------------------------------------- */
/* CORS                                                                       */
/* -------------------------------------------------------------------------- */

const ALLOWED_ORIGINS = [
  "http://localhost:8081", // Expo web
  "http://localhost:19006", // Expo dev
  "https://www.x-periences.fr",
  "https://x-periences.fr",
];

function corsHeaders(origin = "") {
  const allowOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : "https://www.x-periences.fr";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    "Access-Control-Expose-Headers": "Content-Type, Content-Length",
    Vary: "Origin",
  };
}

export async function OPTIONS() {
  const h = headers();
  const origin = h.get("origin") || "";
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

// 🔹 pour les nombres : on IGNORE si vide/NaN ⇒ on ne touche pas la colonne
function safeSetNumber(obj, key, value) {
  if (value === undefined || value === null || value === "") return;
  const n = Number(value);
  if (!Number.isFinite(n)) return;
  obj[key] = n;
}

// 🔹 pour les dates : on IGNORE si vide/invalide
function safeSetDate(obj, key, value) {
  if (!value) return;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return;
  obj[key] = d;
}

// 🔹 pour les strings : on autorise effacement → null
function safeSetString(obj, key, value) {
  if (value === undefined) return;
  obj[key] = value === "" ? null : value;
}

function extractToken(headersList) {
  // 1) Authorization: Bearer xxx (appli)
  const auth = headersList.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m?.[1]) return m[1];

  // 2) Cookie 'token' (web)
  try {
    const cookieStore = cookies();
    const c = cookieStore.get("token")?.value;
    if (c) return c;
  } catch {
    // ignore
  }

  // 3) Cookie brut
  const cookieHeader = headersList.get("cookie") || "";
  const pair = cookieHeader.split(/;\s*/).find((x) => x.startsWith("token="));
  if (pair) return decodeURIComponent(pair.split("=")[1]);

  return null;
}

/* -------------------------------------------------------------------------- */
/* POST /api/update-profil                                                    */
/* -------------------------------------------------------------------------- */

export async function POST(req) {
  const headersList = headers();
  const origin = headersList.get("origin") || "";
  const cors = corsHeaders(origin);

  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    console.error("[update-profil] JWT_SECRET manquant");
    return NextResponse.json(
      { success: false, message: "Configuration serveur invalide" },
      { status: 500, headers: cors }
    );
  }

  // --- Auth ---
  const token = extractToken(headersList);
  if (!token) {
    return NextResponse.json(
      { success: false, message: "Non autorisé" },
      { status: 401, headers: cors }
    );
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (e) {
    console.error("[update-profil] JWT error:", e);
    return NextResponse.json(
      { success: false, message: "Token invalide" },
      { status: 403, headers: cors }
    );
  }

  const userId = Number(decoded.id || decoded.sub);
  if (!userId) {
    console.error("[update-profil] userId invalide dans le token:", decoded);
    return NextResponse.json(
      { success: false, message: "Token invalide" },
      { status: 403, headers: cors }
    );
  }

  // --- Body JSON ---
  let body;
  try {
    body = await req.json();
  } catch (e) {
    console.error("[update-profil] JSON parse error:", e);
    return NextResponse.json(
      { success: false, message: "JSON invalide" },
      { status: 400, headers: cors }
    );
  }

  console.log("[update-profil] userId =", userId, "body =", body);

  /* -------------------------------------------------------------- */
  /* Construction de l'objet data pour Prisma                       */
  /* -------------------------------------------------------------- */

  const data = {};

  // commun (strings → peuvent devenir null pour effacer)
  safeSetString(data, "localisation", body.localisation);
  safeSetString(data, "experience", body.experience);
  safeSetString(data, "rechercheType", body.rechercheType);
  safeSetString(data, "type", body.type);

  // membre 1
  safeSetNumber(data, "age", body.age);
  safeSetDate(data, "dateNaissance", body.dateNaissance);
  safeSetString(data, "fumeur", body.fumeur);
  safeSetString(data, "silhouette", body.silhouette);
  safeSetNumber(data, "taille", body.taille);
  safeSetString(data, "origines", body.origines);
  safeSetString(data, "yeux", body.yeux);
  safeSetString(data, "cheveux", body.cheveux);

  // membre 2 (couple)
  safeSetNumber(data, "age2", body.age2);
  safeSetDate(data, "dateNaissance2", body.dateNaissance2);
  safeSetString(data, "fumeur2", body.fumeur2);
  safeSetString(data, "silhouette2", body.silhouette2);
  safeSetNumber(data, "taille2", body.taille2);
  safeSetString(data, "origines2", body.origines2);
  safeSetString(data, "yeux2", body.yeux2);
  safeSetString(data, "cheveux2", body.cheveux2);
  safeSetString(data, "description2", body.description2);

  // GPS (numériques)
  safeSetNumber(data, "latitude", body.latitude);
  safeSetNumber(data, "longitude", body.longitude);

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { success: false, message: "Aucune donnée à mettre à jour" },
      { status: 400, headers: cors }
    );
  }

  // Vérification que l'utilisateur existe
  const existing = await prisma.utilisateur.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!existing) {
    console.error("[update-profil] Utilisateur introuvable en BDD:", userId);
    return NextResponse.json(
      { success: false, message: "Utilisateur introuvable" },
      { status: 404, headers: cors }
    );
  }

  /* -------------------------------------------------------------- */
  /* Update Prisma                                                  */
  /* -------------------------------------------------------------- */

  try {
    const updated = await prisma.utilisateur.update({
      where: { id: userId },
      data,
    });

    return NextResponse.json(
      { success: true, user: updated },
      { status: 200, headers: cors }
    );
  } catch (e) {
    console.error("[update-profil] DB error:", {
      message: e.message,
      code: e.code,
      meta: e.meta,
    });

    return NextResponse.json(
      {
        success: false,
        message: "Erreur serveur",
        error: e.message,
        errorCode: e.code ?? null,
        errorMeta: e.meta ?? null,
      },
      { status: 500, headers: cors }
    );
  }
}
