// app/api/presence/token/route.js
import { NextResponse } from "next/server";
import { Rest as AblyRest } from "ably";
import { getUserFromToken } from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // ✅ évite toute tentative de cache

const ABLY_API_KEY = process.env.ABLY_API_KEY_SERVER || process.env.ABLY_API_KEY;

const ALLOWED_ORIGINS = [
  "http://localhost:8081",
  "http://localhost:19006",
  "http://localhost:3000",
  "https://x-periences.fr",
  "https://www.x-periences.fr",
];

function corsHeaders(req) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "";

  const h = new Headers();
  if (allowOrigin) {
    h.set("Access-Control-Allow-Origin", allowOrigin);
    h.set("Vary", "Origin");
  }

  h.set("Access-Control-Allow-Credentials", "true");
  h.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // ✅ hyper important : pas de cache
  h.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  h.set("Pragma", "no-cache");
  h.set("Expires", "0");

  return h;
}

export async function OPTIONS(req) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

// ✅ helper commun GET/POST
async function handle(req) {
  if (!ABLY_API_KEY) {
    return NextResponse.json(
      { error: "ABLY_API_KEY manquante" },
      { status: 500, headers: corsHeaders(req) }
    );
  }

  const user = await getUserFromToken({
    req,
    select: { id: true, pseudo: true },
  });

  if (!user?.id) {
    return NextResponse.json(
      { error: "Non authentifié" },
      { status: 401, headers: corsHeaders(req) }
    );
  }

  const ably = new AblyRest(ABLY_API_KEY);

  const tokenRequest = await ably.auth.createTokenRequest({
    clientId: String(user.id), // ✅ l’identité Ably = user.id
    capability: {
      "presence:online": ["presence", "subscribe"],
    },
  });

  // ✅ debug utile (tu peux enlever après)
  console.log("[presence/token] issue token for userId:", user.id, "pseudo:", user.pseudo);

  return NextResponse.json(tokenRequest, { headers: corsHeaders(req) });
}

export async function GET(req) {
  try {
    return await handle(req);
  } catch (e) {
    console.error("presence/token GET error:", e);
    return NextResponse.json(
      { error: "Erreur token Ably" },
      { status: 500, headers: corsHeaders(req) }
    );
  }
}

export async function POST(req) {
  try {
    return await handle(req);
  } catch (e) {
    console.error("presence/token POST error:", e);
    return NextResponse.json(
      { error: "Erreur token Ably" },
      { status: 500, headers: corsHeaders(req) }
    );
  }
}
