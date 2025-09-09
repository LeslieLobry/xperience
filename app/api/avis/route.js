import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET manquant");

const ALLOWED_ORIGINS = [
  "http://localhost:8081",
  "http://localhost:19006",
  "http://localhost:3000",
  "https://www.x-periences.fr",
  "https://x-periences.fr",
];

function corsHeaders(origin = "") {
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "https://www.x-periences.fr";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Platform",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(req) {
  const origin = req.headers.get("origin") || "";
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(req) {
  const origin = req.headers.get("origin") || "";
  const headers = corsHeaders(origin);

  try {
    const body = await req.json();

    // --- Auth: cookie OU Bearer ---
    const cookieStore = await cookies();
    let token = cookieStore.get("token")?.value;
    const auth = req.headers.get("authorization") || "";
    if (!token && auth.startsWith("Bearer ")) token = auth.slice(7);

    if (!token) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers });
    }

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json({ error: "Token invalide" }, { status: 403, headers });
    }

    const auteurId = parseInt(payload.id);
    const { cibleId, commentaire } = body || {};

    if (!cibleId || !commentaire) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400, headers });
    }
    if (auteurId === parseInt(cibleId)) {
      return NextResponse.json({ error: "Vous ne pouvez pas laisser un avis sur vous-même." }, { status: 400, headers });
    }

    const existing = await prisma.avis.findUnique({
      where: { auteurId_cibleId: { auteurId, cibleId: parseInt(cibleId) } },
    });
    if (existing) {
      return NextResponse.json({ error: "Vous avez déjà laissé un avis." }, { status: 400, headers });
    }

    const avis = await prisma.avis.create({
      data: { auteurId, cibleId: parseInt(cibleId), commentaire },
    });

    await prisma.digestNotification.create({
      data: { type: "AVIS", auteurId, destinataireId: parseInt(cibleId), avisId: avis.id },
    });

    return NextResponse.json({ success: true, avis }, { headers });
  } catch (error) {
    console.error("❌ Erreur création avis :", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement." },
      { status: 500, headers }
    );
  }
}
