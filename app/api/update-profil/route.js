// app/api/update-profil/route.js
import { NextResponse } from "next/server";
import { cookies as getCookies, headers as getHeaders } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------------------------------------------------------- */
/* CORS                                                                       */
/* -------------------------------------------------------------------------- */

const ALLOWED_ORIGINS = [
  "http://localhost:8081",   // Expo web
  "http://localhost:19006",  // Expo dev
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
  const origin = (await getHeaders()).get("origin") || "";
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

/* -------------------------------------------------------------------------- */
/* AUTH                                                                       */
/* -------------------------------------------------------------------------- */

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET non défini");

function extractToken(reqHeaders) {
  // 1) Authorization: Bearer xxx (app)
  const auth = reqHeaders.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m?.[1]) return m[1];

  // 2) Cookie 'token' (web)
  try {
    const cookieStore = getCookies();
    const c = cookieStore.get("token")?.value;
    if (c) return c;
  } catch {
    // ignore
  }

  // 3) Cookie header brut (fallback)
  const cookieHeader = reqHeaders.get("cookie") || "";
  const pair = cookieHeader.split(/;\s*/).find((x) => x.startsWith("token="));
  if (pair) return decodeURIComponent(pair.split("=")[1]);

  return null;
}

function safeNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function safeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* -------------------------------------------------------------------------- */
/* POST /api/update-profil                                                    */
/* -------------------------------------------------------------------------- */

export async function POST(req) {
  const reqHeaders = await getHeaders();
  const origin = reqHeaders.get("origin") || "";
  const headers = corsHeaders(origin);

  // --- Auth ---
  const token = extractToken(reqHeaders);
  if (!token) {
    return NextResponse.json(
      { success: false, message: "Non autorisé" },
      { status: 401, headers }
    );
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (e) {
    console.error("JWT error update-profil:", e);
    return NextResponse.json(
      { success: false, message: "Token invalide" },
      { status: 403, headers }
    );
  }

  const userId = Number(decoded.id || decoded.sub);
  if (!userId) {
    return NextResponse.json(
      { success: false, message: "Token invalide" },
      { status: 403, headers }
    );
  }

  // --- Body JSON ---
  let body;
  try {
    body = await req.json();
  } catch (e) {
    console.error("JSON parse error update-profil:", e);
    return NextResponse.json(
      { success: false, message: "JSON invalide" },
      { status: 400, headers }
    );
  }

  /* -------------------------------------------------------------- */
  /* Construction de l'objet data pour Prisma                       */
  /* -------------------------------------------------------------- */

  const data = {};

  // commun
  if (body.localisation !== undefined)
    data.localisation = body.localisation || null;
  if (body.experience !== undefined)
    data.experience = body.experience || null;
  if (body.rechercheType !== undefined)
    data.rechercheType = body.rechercheType || null;
  if (body.type !== undefined) data.type = body.type || null;

  // membre 1
  if (body.age !== undefined) data.age = safeNumber(body.age);
  if (body.dateNaissance !== undefined)
    data.dateNaissance = body.dateNaissance
      ? safeDate(body.dateNaissance)
      : null;
  if (body.fumeur !== undefined) data.fumeur = body.fumeur || null;
  if (body.silhouette !== undefined)
    data.silhouette = body.silhouette || null;
  if (body.taille !== undefined) data.taille = safeNumber(body.taille);
  if (body.origines !== undefined) data.origines = body.origines || null;
  if (body.yeux !== undefined) data.yeux = body.yeux || null;
  if (body.cheveux !== undefined) data.cheveux = body.cheveux || null;

  // membre 2 (couple)
  if (body.age2 !== undefined) data.age2 = safeNumber(body.age2);
  if (body.dateNaissance2 !== undefined)
    data.dateNaissance2 = body.dateNaissance2
      ? safeDate(body.dateNaissance2)
      : null;
  if (body.fumeur2 !== undefined) data.fumeur2 = body.fumeur2 || null;
  if (body.silhouette2 !== undefined)
    data.silhouette2 = body.silhouette2 || null;
  if (body.taille2 !== undefined) data.taille2 = safeNumber(body.taille2);
  if (body.origines2 !== undefined) data.origines2 = body.origines2 || null;
  if (body.yeux2 !== undefined) data.yeux2 = body.yeux2 || null;
  if (body.cheveux2 !== undefined) data.cheveux2 = body.cheveux2 || null;
  if (body.description2 !== undefined)
    data.description2 = body.description2 || null;

  // éventuellement GPS si tu les ajoutes dans le form plus tard
  if (body.latitude !== undefined)
    data.latitude = safeNumber(body.latitude);
  if (body.longitude !== undefined)
    data.longitude = safeNumber(body.longitude);

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { success: false, message: "Aucune donnée à mettre à jour" },
      { status: 400, headers }
    );
  }

  /* -------------------------------------------------------------- */
  /* Update Prisma                                                  */
  /* -------------------------------------------------------------- */

  try {
    const updated = await prisma.utilisateur.update({
      where: { id: userId },
      data,
      // pas de select : on renvoie tout l'utilisateur pour rester
      // compatible avec le reste de l'app
    });

    return NextResponse.json(
      { success: true, user: updated },
      { status: 200, headers }
    );
  } catch (e) {
    console.error("DB error update-profil:", e);
    return NextResponse.json(
      {
        success: false,
        message: "Erreur serveur",
        error: e.message, // utile pour debug, tu peux enlever plus tard
      },
      { status: 500, headers }
    );
  }
}
