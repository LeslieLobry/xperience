import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getUserFromToken } from "../../../lib/auth";

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
  h.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return h;
}

export async function OPTIONS(req) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function GET(req) {
  const headers = corsHeaders(req);
  try {
    const me = await getUserFromToken();
    if (!me) return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers });

    const u = await prisma.utilisateur.findUnique({
      where: { id: me.id },
      select: { pushEnabled: true, expoPushToken: true },
    });

    return NextResponse.json(
      { enabled: !!u?.pushEnabled, hasToken: !!u?.expoPushToken },
      { headers }
    );
  } catch (e) {
    console.error("GET /push/settings error:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers });
  }
}

export async function POST(req) {
  const headers = corsHeaders(req);
  try {
    const me = await getUserFromToken();
    if (!me) return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers });

    const { enabled } = await req.json();
    if (typeof enabled !== "boolean") {
      return NextResponse.json({ error: "enabled doit être un booléen" }, { status: 400, headers });
    }

    await prisma.utilisateur.update({
      where: { id: me.id },
      data: { pushEnabled: enabled },
    });

    return NextResponse.json({ ok: true }, { headers });
  } catch (e) {
    console.error("POST /push/settings error:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers });
  }
}
