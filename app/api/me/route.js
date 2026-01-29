// app/api/me/route.js
import { NextResponse } from "next/server";
import { headers as getHeaders, cookies as getCookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET non défini");

// --- CORS ---
const ALLOWED_ORIGINS = [
  "http://localhost:8081",
  "http://localhost:19006",
  "https://www.x-periences.fr",
  "https://x-periences.fr",
];
function corsHeaders(origin = "") {
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "https://www.x-periences.fr";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Platform",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
export async function OPTIONS() {
  const origin = (await getHeaders()).get("origin") || "";
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

// --- helpers ---
function extractToken(reqHeaders) {
  // 1) Authorization: Bearer ...
  const auth = reqHeaders.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m?.[1]) return m[1];

  // 2) Cookie HttpOnly via next/headers
  try {
    const c = getCookies().get("token")?.value;
    if (c) return c;
  } catch {}

  // 3) Cookie header brut (fallback)
  const cookie = reqHeaders.get("cookie") || "";
  const pair = cookie.split(/;\s*/).find((x) => x.startsWith("token="));
  if (pair) return decodeURIComponent(pair.split("=")[1]);

  return null;
}

const ADMIN_ROLES = ["admin", "superadmin", "owner", "root"];
const normalizeRole = (r) => String(r ?? "").trim().toLowerCase();
const isAdminRole = (r) => ADMIN_ROLES.includes(normalizeRole(r));

/** ✅ compare "même jour" en timezone Europe/Paris */
function sameDayParis(d1, d2) {
  if (!d1 || !d2) return false;
  const a = new Date(d1);
  const b = new Date(d2);
  if (isNaN(a) || isNaN(b)) return false;
  const sa = a.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
  const sb = b.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
  return sa === sb;
}

export async function GET() {
  const reqHeaders = await getHeaders();
  const origin = reqHeaders.get("origin") || "";
  const headers = corsHeaders(origin);

  // 1) Auth
  const token = extractToken(reqHeaders);
  if (!token) {
    return NextResponse.json({ success: false, message: "Non authentifié." }, { status: 401, headers });
  }

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

  // 2) DB — select minimal FIABLE + champs statut
  try {
    const u = await prisma.utilisateur.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        pseudo: true,
        role: true,
        type: true,
        photoUrl: true,
        localisation: true,
        experience: true,
        rechercheType: true,
        age: true,
        fumeur: true,
        silhouette: true,
        taille: true,
        origines: true,
        yeux: true,
        cheveux: true,
        description: true,
        createdAt: true,
        lastLogin: true,

        // 🟢 ajout pour présence:
        statut: true,
        statutAuto: true,
        lastSeenAt: true,

        // Relations courtes
        recherches: { select: { id: true, label: true } },
        envies: { select: { id: true, label: true } },
      },
    });

    if (!u) {
      return NextResponse.json({ success: false, message: "Utilisateur introuvable." }, { status: 401, headers });
    }

    // ✅ MAJ "lastLogin" une seule fois par jour (auto-login inclus)
    // -> comme ça, si tu reviens aujourd’hui, tu verras bien la date d’aujourd’hui
    const nowDate = new Date();
    let lastLoginEffective = u.lastLogin;

    if (!u.lastLogin || !sameDayParis(u.lastLogin, nowDate)) {
      const updated = await prisma.utilisateur.update({
        where: { id: userId },
        data: { lastLogin: nowDate },
        select: { lastLogin: true },
      });
      lastLoginEffective = updated.lastLogin;
    }

    // 🧠 Calcul léger du statut en ligne si mode auto
    const ONLINE_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
    const now = Date.now();
    const seenTs = u.lastSeenAt ? new Date(u.lastSeenAt).getTime() : 0;
    const statutComputed =
      u.statutAuto && seenTs && now - seenTs <= ONLINE_WINDOW_MS ? "en_ligne" : "hors_ligne";

    const roleNormalized = normalizeRole(u.role);
    const isAdmin = isAdminRole(u.role);

    // On retourne le statut calculé sans casser la forme existante
    return NextResponse.json(
      {
        success: true,
        user: {
          ...u,
          lastLogin: lastLoginEffective, // ✅ renvoie la vraie valeur après MAJ
          statut: statutComputed, // ⬅️ remplace côté réponse (non destructif pour le reste)
          roleNormalized,
          isAdmin,
        },
      },
      { headers }
    );
  } catch (err) {
    console.error("❌ /api/me error:", err?.message || err);
    return NextResponse.json({ success: false, message: "Erreur serveur." }, { status: 500, headers });
  }
}
