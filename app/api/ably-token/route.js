// app/api/ably-token/route.js
import { NextResponse } from "next/server";
import Ably from "ably";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const ABLY_API_KEY = process.env.ABLY_API_KEY_SERVER;

if (!JWT_SECRET) throw new Error("JWT_SECRET manquant");
if (!ABLY_API_KEY) throw new Error("ABLY_API_KEY manquant");

// — util: récupère l'origin autorisé (CORS light)
function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "https://www.x-periences.fr",
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Requested-With, X-Platform",
    "Cache-Control": "no-store",
  };
}

function getBearer(req) {
  const auth = req.headers.get("authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
}

function getCookieToken(req) {
  // si tu nommes le cookie "token"
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET); // { id, ... }
  } catch {
    return null;
  }
}

export async function OPTIONS(req) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function GET(req) {
  const origin = req.headers.get("origin");
  // 1) Accepte soit Bearer, soit cookie (comme le site)
  const bearer = getBearer(req);
  const cookieToken = getCookieToken(req);
  const token = bearer || cookieToken;

  const user = verifyToken(token);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders(origin) });
  }

  // 2) Crée un TokenRequest Ably côté serveur (clé secrète côté serveur uniquement)
  const rest = new Ably.Rest(ABLY_API_KEY);
  const tokenRequest = await rest.auth.createTokenRequest({
    clientId: String(user.id),
    ttl: 60 * 60 * 1000, // 1h
    // capability optionnelle si tu veux restreindre
    // capability: JSON.stringify({
    //   [`conversation-*`]: ["publish","subscribe"],
    //   [`notifications-${user.id}`]: ["subscribe"]
    // }),
  });

  return NextResponse.json(tokenRequest, { headers: corsHeaders(origin) });
}
