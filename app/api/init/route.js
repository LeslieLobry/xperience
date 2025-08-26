// app/api/init/route.js
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "../../../lib/prisma";

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
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(req) {
  const origin = req.headers.get("origin") || "";
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

// ---- helpers ----
function extractTokenFromReq(req) {
  // 1) Authorization: Bearer ...
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m?.[1]) return m[1];

  // 2) cookie token=...
  const cookie = req.headers.get("cookie") || "";
  const c = cookie.split(/;\s*/).find((x) => x.startsWith("token="));
  if (c) return c.split("=")[1];

  return null;
}

export async function GET(req) {
  const origin = req.headers.get("origin") || "";
  const headers = corsHeaders(origin);

  try {
    // --- Auth ---
    const token = extractTokenFromReq(req);
    if (!token) {
      console.warn("[/api/init] token manquant");
      return NextResponse.json({ success: false, error: "Non authentifié" }, { status: 401, headers });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      console.warn("[/api/init] jwt.verify invalide:", e?.message);
      return NextResponse.json({ success: false, error: "Jeton invalide" }, { status: 401, headers });
    }

    const userId = Number(decoded.id || decoded.sub);
    if (!userId) {
      console.warn("[/api/init] userId absent dans le token");
      return NextResponse.json({ success: false, error: "Jeton invalide" }, { status: 401, headers });
    }

    // --- Data ---
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
      // ⚠️ on enlève le filtre "supprimé" si le champ n'existe pas côté schema
      prisma.conversation.findMany({
        where: {
          participants: {
            some: { utilisateurId: userId },
          },
        },
        include: {
          participants: {
            // si tu as bien un champ 'supprime' boolean, remets: where: { supprime: false }
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
      console.warn("[/api/init] utilisateur introuvable:", userId);
      return NextResponse.json({ success: false, error: "Utilisateur introuvable" }, { status: 401, headers });
    }

    // événements à venir
    const now = new Date();
    const evenements = (evenementsRaw || [])
      .filter((evt) => Array.isArray(evt.dates) && evt.dates.some((d) => new Date(d) >= now))
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
    console.error("❌ Erreur /api/init :", err?.message || err);
    // expose (temporairement) le message pour débug
    return NextResponse.json({ success: false, error: "Erreur serveur", detail: String(err?.message || err) }, { status: 500, headers });
  }
}
