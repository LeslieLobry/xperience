// app/api/utilisateur/search/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getUserFromToken } from "../../../../lib/auth";

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
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Platform, x-platform, X-Action, x-action, X-Client, x-client",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(req) {
  const origin = req.headers.get("origin") || "";
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function GET(req) {
  const origin = req.headers.get("origin") || "";
  const headers = corsHeaders(origin);

  try {
    const me = await getUserFromToken();
    if (!me) return NextResponse.json({ error: "Non autorisé" }, { status: 401, headers });

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 50);

    if (q.length < 2) return NextResponse.json([], { headers });

    const users = await prisma.utilisateur.findMany({
      where: {
        AND: [
          { id: { not: me.id } }, // n'inclus pas moi-même
          {
            OR: [
              { pseudo: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          },
        ],
      },
      select: { id: true, pseudo: true, photoUrl: true },
      orderBy: { pseudo: "asc" },
      take: limit,
    });

    return NextResponse.json(users, { headers });
  } catch (e) {
    console.error("Erreur /utilisateur/search:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers });
  }
}
