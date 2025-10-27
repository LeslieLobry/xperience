// app/api/livekit/token/route.js
import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* -------------------------------- Env -------------------------------- */
// ⚠️ Tu voulais garder les fallbacks → on les laisse.
//    Assure-toi simplement que ces variables pointent toutes vers la MÊME instance.
const LIVEKIT_URL =
  process.env.LIVEKIT_URL ||
  process.env.LIVEKIT_WS_URL ||
  process.env.NEXT_PUBLIC_LIVEKIT_URL;

const API_KEY = process.env.LIVEKIT_API_KEY || process.env.LIVEKIT_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET || process.env.LIVEKIT_SECRET;

/* ------------------------------ CORS ---------------------------------- */
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:19006",
  "http://localhost:8081",
  "https://www.x-periences.fr",
  "https://x-periences.fr",
];
const DEFAULT_WEB = "https://www.x-periences.fr";

function pickAllowOrigin(origin = "") {
  if (!origin || origin === "null") return "*"; // RN / outils → pas de cookies sur cette route
  return ALLOWED_ORIGINS.includes(origin) ? origin : DEFAULT_WEB;
}

function corsHeaders(req) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = pickAllowOrigin(origin);
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(req) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

/* ------------------------------ Utils --------------------------------- */
/** Normalise toute forme d’entrée (http(s)/wss(s)/domaine nu)
 *  → retourne TOUJOURS: wss://<host>/rtc
 */
function normalizeWs(url) {
  if (!url) return null;
  let u = String(url).trim();

  // enlève protocole si présent
  u = u.replace(/^https?:\/\//, "").replace(/^wss?:\/\//, "");
  // supprime les trailing slashes
  u = u.replace(/\/+$/, "");
  // force /rtc
  if (!/\/rtc(\?|$)/.test(u)) u = u + "/rtc";

  return "wss://" + u;
}

function sanitizeIdentity(id) {
  return String(id || "").trim().replace(/\s+/g, "_").slice(0, 128);
}
function makeIdentity(base) {
  let s = String(base ?? "user-anon").trim();
  if (/^\d+$/.test(s)) s = `user-${s}`;
  return sanitizeIdentity(s);
}

// format stable pour la room : "conversation-<id>"
function normalizeRoom(input) {
  if (!input) return null;
  const m = String(input).match(/\d+/); // extrait le 1er nombre
  return m ? `conversation-${m[0]}` : null;
}

async function buildJwt({ identity, room, ttlSec = 600, name }) {
  if (!API_KEY || !API_SECRET)
    throw new Error("LIVEKIT_API_KEY / LIVEKIT_API_SECRET manquants");

  const at = new AccessToken(API_KEY, API_SECRET, {
    identity: sanitizeIdentity(identity),
    ttl: ttlSec,
    name: name ? String(name).slice(0, 128) : undefined,
  });
  at.addGrant({
    roomJoin: true,
    room: String(room),
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  return await at.toJwt();
}

/* -------------------------------- GET --------------------------------- */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    if (searchParams.get("diag") === "1") {
      return NextResponse.json(
        {
          hasUrl: !!LIVEKIT_URL,
          hasKey: !!API_KEY,
          hasSecret: !!API_SECRET,
          runtime: "nodejs",
          wsUrl: LIVEKIT_URL ? normalizeWs(LIVEKIT_URL) : null, // ← inclut /rtc
          keyPrefix: API_KEY ? String(API_KEY).slice(0, 6) : null, // aide debug
        },
        { headers: corsHeaders(req) }
      );
    }

    const wsUrl = normalizeWs(LIVEKIT_URL);
    if (!wsUrl)
      throw new Error(
        "LIVEKIT_URL manquante (mets https://<ton-sous-domaine>.livekit.cloud)"
      );
    if (!API_KEY || !API_SECRET)
      throw new Error("LIVEKIT_API_KEY / LIVEKIT_API_SECRET manquants");

    const rawRoom =
      searchParams.get("room") ||
      searchParams.get("roomName") ||
      searchParams.get("conversationId");
    const room = normalizeRoom(rawRoom);

    if (!room) {
      return NextResponse.json(
        { success: false, error: "room/conversationId requis" },
        { status: 400, headers: corsHeaders(req) }
      );
    }

    const identityBase =
      searchParams.get("identity") || searchParams.get("userId") || "user-anon";
    const identity = makeIdentity(identityBase);

    const token = await buildJwt({ identity, room, ttlSec: 600 });

    console.log("[LIVEKIT][GET]", { room, identity });

    return NextResponse.json(
      { success: true, token, wsUrl, identity, room },
      { status: 200, headers: corsHeaders(req) }
    );
  } catch (e) {
    console.error("[livekit/token][GET]", e);
    return NextResponse.json(
      { success: false, error: e?.message || "Token build failed" },
      { status: 500, headers: corsHeaders(req) }
    );
  }
}

/* -------------------------------- POST -------------------------------- */
export async function POST(req) {
  try {
    const wsUrl = normalizeWs(LIVEKIT_URL);
    if (!wsUrl)
      throw new Error(
        "LIVEKIT_URL manquante (mets https://<ton-sous-domaine>.livekit.cloud)"
      );
    if (!API_KEY || !API_SECRET)
      throw new Error("LIVEKIT_API_KEY / LIVEKIT_API_SECRET manquants");

    let bodyText = "";
    try {
      bodyText = await req.text();
    } catch {}
    let body = {};
    try {
      if (bodyText) body = JSON.parse(bodyText);
    } catch {
      const p = new URLSearchParams(bodyText);
      body = Object.fromEntries(p.entries());
    }

    const rawRoom =
      body.room || body.roomName || body.conversationId || body.convId;
    const room = normalizeRoom(rawRoom);

    if (!room) {
      return NextResponse.json(
        { success: false, error: "room/conversationId requis" },
        { status: 400, headers: corsHeaders(req) }
      );
    }

    const identityBase = body.identity || body.userId || "user-anon";
    const name = body.name || undefined;
    const identity = makeIdentity(identityBase);

    const token = await buildJwt({ identity, room, ttlSec: 600, name });

    console.log("[LIVEKIT][POST]", { room, identity });

    return NextResponse.json(
      { success: true, token, wsUrl, identity, room },
      { status: 200, headers: corsHeaders(req) }
    );
  } catch (e) {
    console.error("[livekit/token][POST]", e);
    return NextResponse.json(
      { success: false, error: e?.message || "Token build failed" },
      { status: 500, headers: corsHeaders(req) }
    );
  }
}
