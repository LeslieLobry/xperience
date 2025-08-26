// app/api/init/route.js
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "../../../lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET non défini");

// --- CORS ---
const ALLOWED_ORIGINS = [
  "http://localhost:8081",   // Expo web
  "http://localhost:19006",  // Expo dev alt
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

// --- Auth: cookie 'token' OU header Authorization: Bearer ---
function extractTokenFromReq(req) {
  // 1) Authorization: Bearer <jwt>
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m?.[1]) return m[1];

  // 2) cookie "token=..."
  const cookie = req.headers.get("cookie") || "";
  const c = cookie.split(/;\s*/).find((x) => x.startsWith("token="));
  if (c) return c.split("=")[1];

  return null;
}

export async function GET(req) {
  const origin = req.headers.get("origin") || "";
  const headers = corsHeaders(origin);

  // ---- auth ----
  const token = extractTokenFromReq(req);
  if (!token) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return NextResponse.json({ error: "Jeton invalide" }, { status: 401, headers });
  }

  const userId = Number(decoded.id || decoded.sub);
  if (!userId) {
    return NextResponse.json({ error: "Jeton invalide" }, { status: 401, headers });
  }

  try {
    const [utilisateur, conversations, notifications, articles, evenementsRaw] = await Promise.all([
      prisma.utilisateur.findUnique({
        where: { id: userId },
        select: {
          id: true,
          pseudo: true,
          type: true,
          email: true,
          photoUrl: true,
          role: true,
          age: true,
          localisation: true,
          verificationDeadline: true,
          verificationIdentiteStatut: true,
        },
      }),
      prisma.conversation.findMany({
        where: { participants: { some: { utilisateurId: userId, supprimé: false } } },
        include: {
          participants: {
            where: { supprimé: false },
            take: 2,
            select: {
              utilisateurId: true,
              utilisateur: { select: { id: true, pseudo: true, photoUrl: true } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      prisma.notification.findMany({
        where: { utilisateurId: userId, lu: false },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, message: true, lien: true, createdAt: true },
      }),
      prisma.article.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { images: { take: 1, select: { url: true } } },
      }),
      prisma.evenement.findMany({
        select: { id: true, titre: true, imageUrl: true, dates: true, lieu: true },
        take: 20,
      }),
    ]);

    if (!utilisateur) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 401, headers });
    }

    // Trier/filtrer les évènements à venir
    const now = new Date();
    const evenements = (evenementsRaw || [])
      .filter(
        (evt) => Array.isArray(evt.dates) && evt.dates.some((d) => new Date(d) >= now)
      )
      .sort((a, b) => {
        const nextA = (a.dates || []).find((d) => new Date(d) >= now) || a.dates?.[0];
        const nextB = (b.dates || []).find((d) => new Date(d) >= now) || b.dates?.[0];
        return new Date(nextA) - new Date(nextB);
      })
      .slice(0, 5);

    return NextResponse.json(
      { success: true, utilisateur, conversations, notifications, articles, evenements },
      { headers }
    );
  } catch (err) {
    console.error("❌ Erreur /api/init :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers });
  }
}
