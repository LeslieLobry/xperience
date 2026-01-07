import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const JWT_SECRET = process.env.JWT_SECRET || "";

/* ---------- CORS (si Expo / RN appelle ton domaine) ---------- */
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
  h.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return h;
}

async function getUserFromRequest(req) {
  if (!JWT_SECRET) return null;

  // Mobile: Authorization: Bearer xxx
  const auth = req.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  const tokenHeader = match?.[1];

  // Web: cookie token
  const cookieStore = cookies();
  const tokenCookie = cookieStore.get("token")?.value;

  const token = tokenHeader || tokenCookie;
  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function OPTIONS(req) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user?.id) {
      return NextResponse.json(
        { ok: false, error: "Non authentifié" },
        { status: 401, headers: corsHeaders(req) }
      );
    }

    await prisma.utilisateur.update({
      where: { id: Number(user.id) },
      data: {
        lastSeenAt: new Date(),
        statutAuto: true, // ✅ on garde juste ça + lastSeenAt
        // ❌ ne pas écrire "statut" ici
      },
    });

    return NextResponse.json({ ok: true }, { status: 200, headers: corsHeaders(req) });
  } catch (e) {
    console.error("heartbeat error", e);
    return NextResponse.json(
      { ok: false, error: "Erreur serveur" },
      { status: 500, headers: corsHeaders(req) }
    );
  }
}
