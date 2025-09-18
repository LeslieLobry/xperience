// app/api/utilisateur/[id]/has-liked/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
  const h = new Headers();
  if (ALLOWED_ORIGINS.includes(origin)) {
    h.set("Access-Control-Allow-Origin", origin);
    h.set("Vary", "Origin");
  }
  h.set("Access-Control-Allow-Credentials", "true");
  h.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  // utile au debug
  h.set("Access-Control-Expose-Headers", "Content-Type, Content-Length");
  return h;
}

export function OPTIONS(req) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

/* ---------- Auth (cookie 'token' OU Authorization: Bearer) ---------- */
const JWT_SECRET = process.env.JWT_SECRET || "";

async function getUserFromRequest(req) {
  // Bearer
  const m = (req.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  const tokenHeader = m?.[1];

  // Cookie
  const tokenCookie = (await cookies()).get("token")?.value;

  const token = tokenHeader || tokenCookie;
  if (!token || !JWT_SECRET) return null;

  try {
    return jwt.verify(token, JWT_SECRET); // { id, ... }
  } catch {
    return null;
  }
}

/* ---------- GET /has-liked ---------- */
export async function GET(req, { params }) {
  const headers = corsHeaders(req);

  const cibleId = Number(params.id);
  if (!Number.isFinite(cibleId) || cibleId <= 0) {
    return NextResponse.json({ error: "ID cible invalide" }, { status: 400, headers });
  }

  const user = await getUserFromRequest(req);

  // Si non connecté, on renvoie 200 { hasLiked:false } pour ne pas bloquer le front
  if (!user) {
    return NextResponse.json({ hasLiked: false }, { status: 200, headers });
  }

  const like = await prisma.like.findFirst({
    where: { auteurId: Number(user.id), cibleId },
    select: { id: true },
  });

  return NextResponse.json({ hasLiked: !!like }, { headers });
}
