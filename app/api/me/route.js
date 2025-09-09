// app/api/me/route.js
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "../../../lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET non défini");

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
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
export async function OPTIONS(req) {
  const origin = req.headers.get("origin") || "";
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

function extractTokenFromReq(req) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m?.[1]) return m[1];
  const cookie = req.headers.get("cookie") || "";
  const c = cookie.split(/;\s*/).find((x) => x.startsWith("token="));
  if (c) return c.split("=")[1];
  return null;
}

const ADMIN_ROLES = ["admin", "superadmin", "owner", "root"];
const normalizeRole = (r) => String(r ?? "").trim().toLowerCase();
const isAdminRole = (r) => ADMIN_ROLES.includes(normalizeRole(r));

export async function GET(req) {
  const origin = req.headers.get("origin") || "";
  const headers = corsHeaders(origin);

  const token = extractTokenFromReq(req);
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

  try {
    const u = await prisma.utilisateur.findUnique({
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
        fumeur: true,
        silhouette: true,
        taille: true,
        origines: true,
        yeux: true,
        cheveux: true,
        createdAt: true,
        lastLogin: true,
        verificationDeadline: true,
        verificationIdentiteStatut: true,
        orientation: true,
        // ⬇️⬇️ ajoute les relations attendues par ton composant
        recherches: { select: { label: true } },
        envies: { select: { label: true } },
      },
    });

    if (!u) {
      return NextResponse.json({ success: false, message: "Utilisateur introuvable." }, { status: 401, headers });
    }

    const roleNormalized = normalizeRole(u.role);
    const isAdmin = isAdminRole(u.role);

    return NextResponse.json(
      { success: true, user: { ...u, roleNormalized, isAdmin } },
      { headers }
    );
  } catch (err) {
    console.error("❌ Erreur API /me :", err?.message || err);
    return NextResponse.json({ success: false, message: "Erreur serveur." }, { status: 500, headers });
  }
}
