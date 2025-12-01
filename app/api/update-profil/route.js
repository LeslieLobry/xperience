// app/api/update-profil/route.js
import { NextResponse } from "next/server";
import { cookies as getCookies, headers as getHeaders } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------------------------------------------------------- */
/* ⚙️ CORS                                                                    */
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
/* 🔐 AUTH                                                                    */
/* -------------------------------------------------------------------------- */

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET non défini");

function extractToken(reqHeaders) {
  // 1) Authorization: Bearer xxx (app mobile)
  const auth = reqHeaders.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m?.[1]) return m[1];

  // 2) Cookie 'token=' (web)
  try {
    const cookieStore = getCookies();
    const cookieToken = cookieStore.get("token")?.value;
    if (cookieToken) return cookieToken;
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

/* -------------------------------------------------------------------------- */
/* 📨 POST /api/update-profil                                                 */
/* -------------------------------------------------------------------------- */

export async function POST(req) {
  const reqHeaders = await getHeaders();
  const origin = reqHeaders.get("origin") || "";
  const headers = corsHeaders(origin);

  /* --- Auth --- */
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

  /* --- Body JSON --- */
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

  /* --- Construction des données à mettre à jour --- */
  const data = {};

  if (body.pseudo !== undefined) data.pseudo = String(body.pseudo).trim();
  if (body.description !== undefined)
    data.description = String(body.description).trim();
  if (body.localisation !== undefined)
    data.localisation = String(body.localisation).trim();

  // numériques : on ne met à jour que si valeur valide
  if (body.age !== undefined) {
    const n = safeNumber(body.age);
    if (n !== null) data.age = n;
  }
  if (body.taille !== undefined) {
    const n = safeNumber(body.taille);
    if (n !== null) data.taille = n;
  }

  if (body.silhouette !== undefined) data.silhouette = body.silhouette;
  if (body.yeux !== undefined) data.yeux = body.yeux;
  if (body.cheveux !== undefined) data.cheveux = body.cheveux;
  if (body.statut !== undefined) data.statut = body.statut;
  if (body.experience !== undefined) data.experience = body.experience;

  // GPS éventuels
  if (body.latitude !== undefined) {
    const n = safeNumber(body.latitude);
    if (n !== null) data.latitude = n;
  }
  if (body.longitude !== undefined) {
    const n = safeNumber(body.longitude);
    if (n !== null) data.longitude = n;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { success: false, message: "Aucune donnée à mettre à jour" },
      { status: 400, headers }
    );
  }

  /* --- Update Prisma --- */
  try {
    const updated = await prisma.utilisateur.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        pseudo: true,
        description: true,
        localisation: true,
        age: true,
        taille: true,
        silhouette: true,
        yeux: true,
        cheveux: true,
        statut: true,
        experience: true,
        latitude: true,
        longitude: true,
        photoUrl: true,
      },
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
        error: e.message, // tu pourras enlever ce champ en prod si tu veux
      },
      { status: 500, headers }
    );
  }
}
