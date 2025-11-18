// app/api/likes/donnes/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

/* ---------- CORS ---------- */
const ALLOWED_ORIGINS = [
  "http://localhost:8081",
  "http://localhost:19006",
  "https://x-periences.fr",
  "https://www.x-periences.fr",
];

function corsHeaders(req) {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : "";
  const h = new Headers();
  if (allowed) {
    h.set("Access-Control-Allow-Origin", allowed);
    h.set("Vary", "Origin");
  }
  h.set("Access-Control-Allow-Credentials", "true");
  h.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return h;
}

export async function OPTIONS(req) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

/* ---------- Auth ---------- */
const JWT_SECRET = process.env.JWT_SECRET || "";

async function getUserFromRequest(req) {
  const auth = req.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  const tokenHeader = match?.[1];

  const cookieStore = cookies(); // pas besoin de await ici
  const tokenCookie = cookieStore.get("token")?.value;

  const token = tokenHeader || tokenCookie;
  if (!token || !JWT_SECRET) return null;

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/* ---------- GET = Likes donnés ---------- */
export async function GET(req) {
  const headers = corsHeaders(req);

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401, headers }
      );
    }

    const userId = Number(user.id);

    const likes = await prisma.like.findMany({
      where: { auteurId: userId },          // 👉 likes que TU as envoyés
      orderBy: { createdAt: "desc" },
      include: {
        auteur: {
          select: {
            id: true,
            pseudo: true,
            photoUrl: true,                // toi
          },
        },
        cible: {
          select: {
            id: true,
            pseudo: true,
            photoUrl: true,                // la personne que tu as likée
          },
        },
      },
    });

    const payload = likes.map((l) => ({
      id: l.id,
      createdAt: l.createdAt,
      from: l.auteur,  // { id, pseudo, photoUrl }
      to: l.cible,     // { id, pseudo, photoUrl }
    }));

    return NextResponse.json(payload, { headers });
  } catch (err) {
    console.error("Erreur GET /likes/donnes :", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500, headers }
    );
  }
}
