import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

/* ---------- CORS ---------- */
const ALLOWED_ORIGINS = [
  "http://localhost:8081",      // Expo web
  "http://localhost:19006",     // Expo dev
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
  h.set("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return h;
}

export async function OPTIONS(req) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

/* ---------- Auth (cookie 'token' OU Authorization: Bearer) ---------- */
const JWT_SECRET = process.env.JWT_SECRET || "";

async function getUserFromRequest(req) {
  // Authorization header (Bearer)
  const auth = req.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  const tokenHeader = match?.[1];

  // Cookie
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("token")?.value;

  const token = tokenHeader || tokenCookie;
  if (!token || !JWT_SECRET) return null;

  try {
    return jwt.verify(token, JWT_SECRET); // ex: { id, email, ... }
  } catch {
    return null;
  }
}

/* ---------- POST = LIKE ---------- */
export async function POST(req) {
  const headers = corsHeaders(req);

  try {
    const body = await req.json();
    const { cibleId } = body;
    if (!cibleId || isNaN(cibleId)) {
      return NextResponse.json(
        { error: "cibleId manquant ou invalide" },
        { status: 400, headers }
      );
    }

    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401, headers }
      );
    }

    // Création du like
    const like = await prisma.like.create({
      data: {
        auteurId: Number(user.id),
        cibleId: Number(cibleId),
      },
    });

    // Ajout au digest
    await prisma.digestNotification.create({
      data: {
        destinataireId: Number(cibleId),
        auteurId: Number(user.id),
        likeId: like.id,
      },
    });

    return NextResponse.json(like, { headers });
  } catch (err) {
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "Like déjà existant" },
        { status: 400, headers }
      );
    }
    console.error("Erreur POST /likes :", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500, headers }
    );
  }
}

/* ---------- DELETE = UNLIKE ---------- */
export async function DELETE(req) {
  const headers = corsHeaders(req);

  try {
    const body = await req.json();
    const { cibleId } = body;
    if (!cibleId || isNaN(cibleId)) {
      return NextResponse.json(
        { error: "cibleId manquant ou invalide" },
        { status: 400, headers }
      );
    }

    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401, headers }
      );
    }

    await prisma.like.deleteMany({
      where: {
        auteurId: Number(user.id),
        cibleId: Number(cibleId),
      },
    });

    return NextResponse.json({ success: true }, { headers });
  } catch (err) {
    console.error("Erreur DELETE /likes :", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500, headers }
    );
  }
}
