// app/api/livekit/token/route.js
import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk"; // v2: plus de VideoGrant

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* -------------------------------- Env -------------------------------- */
const LIVEKIT_URL =
  process.env.LIVEKIT_URL ||
  process.env.LIVEKIT_WS_URL ||
  process.env.NEXT_PUBLIC_LIVEKIT_URL;

const API_KEY = "API8ng8u3NfF45z" ||
  process.env.LIVEKIT_API_KEY ||
  process.env.LIVEKIT_KEY;

const API_SECRET = "v3seTBOPfHnsfLNHRX7EGnvDHZNo7twKJ0M3lz8WP6fB" ||
  process.env.LIVEKIT_API_SECRET ||
  process.env.LIVEKIT_SECRET;

const EXPECT_HOST =
  process.env.LIVEKIT_EXPECT_HOST ||
  (LIVEKIT_URL ? new URL(LIVEKIT_URL.replace(/^wss?:\/\//, "https://")).host : null);

/* Pour diag */
const URL_SRC =
  (process.env.LIVEKIT_URL && "LIVEKIT_URL") ||
  (process.env.LIVEKIT_WS_URL && "LIVEKIT_WS_URL") ||
  (process.env.NEXT_PUBLIC_LIVEKIT_URL && "NEXT_PUBLIC_LIVEKIT_URL") || "NONE";

const KEY_SRC =
  (process.env.LIVEKIT_API_KEY && "LIVEKIT_API_KEY") ||
  (process.env.LIVEKIT_KEY && "LIVEKIT_KEY") || "NONE";

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
  if (!origin || origin === "null") return "*";
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
function normalizeWs(url) {
  if (!url) return null;
  let u = String(url).trim()
    .replace(/^https?:\/\//, "")
    .replace(/^wss?:\/\//, "")
    .replace(/\/+$/, "");
  return "wss://" + u;
}
function hostOf(u) {
  try { return new URL(String(u).replace(/^wss?:\/\//, "https://")).host; } catch { return null; }
}

function sanitizeIdentity(id) {
  return String(id || "").trim().replace(/\s+/g, "_").slice(0, 128);
}
function makeIdentity(base) {
  let s = String(base ?? "user-anon").trim();
  if (/^\d+$/.test(s)) s = `user-${s}`;
  return sanitizeIdentity(s);
}
function normalizeRoom(input) {
  if (!input) return null;
  const m = String(input).match(/\d+/);
  return m ? `conversation-${m[0]}` : null;
}

/* --------------------------- JWT builder (v2) -------------------------- */
async function buildJwt({ identity, room, ttlSec = 600, name }) {
  if (!API_KEY || !API_SECRET)
    throw new Error("LIVEKIT_API_KEY / LIVEKIT_API_SECRET manquants");

  const at = new AccessToken(API_KEY, API_SECRET, {
    identity: sanitizeIdentity(identity),
    ttl: ttlSec,
    metadata: name ? JSON.stringify({ name }) : undefined,
  });

  // ✅ v2: on utilise addGrant() avec un objet { video: {...} }
  at.addGrant({
    video: {
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true,
    },
  });

  return await at.toJwt();
}

function decodeJwt(t) {
  try {
    const b = t.split(".")[1];
    const json = JSON.parse(Buffer.from(b, "base64url").toString("utf8"));
    return json;
  } catch { return null; }
}

/* -------------------------------- GET --------------------------------- */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    if (searchParams.get("diag") === "1") {
      const wsUrlRaw = LIVEKIT_URL ? normalizeWs(LIVEKIT_URL) : null;
      return NextResponse.json(
        {
          hasUrl: !!LIVEKIT_URL,
          hasKey: !!API_KEY,
          hasSecret: !!API_SECRET,
          runtime: "nodejs",
          wsUrl: wsUrlRaw,
          urlSource: URL_SRC,
          keySource: KEY_SRC,
          keyPrefix: API_KEY ? String(API_KEY).slice(0, 8) : null,
          expectHost: EXPECT_HOST || null,
          gotHost: hostOf(wsUrlRaw) || null,
        },
        { headers: corsHeaders(req) }
      );
    }

    let wsUrl = normalizeWs(LIVEKIT_URL);
    if (!wsUrl)
      throw new Error("LIVEKIT_URL manquante (ex: https://<sous-domaine>.livekit.cloud)");
    if (!API_KEY || !API_SECRET)
      throw new Error("LIVEKIT_API_KEY / LIVEKIT_API_SECRET manquants");

    if (EXPECT_HOST && hostOf(wsUrl) !== EXPECT_HOST) {
      wsUrl = "wss://" + EXPECT_HOST;
    }

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
    const payload = decodeJwt(token);

    if (payload?.iss !== API_KEY) {
      throw new Error(
        `LIVEKIT_TOKEN_MISMATCH: iss=${payload?.iss || "null"} != API_KEY=${String(API_KEY).slice(0, 8)}…`
      );
    }

    return NextResponse.json(
      {
        success: true,
        token,
        wsUrl,
        identity,
        room,
        _diag: {
          iss: payload?.iss,
          video: payload?.video,
          room: payload?.video?.room || payload?.room,
          nbf: payload?.nbf,
          exp: payload?.exp,
        },
      },
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
    let wsUrl = normalizeWs(LIVEKIT_URL);
    if (!wsUrl)
      throw new Error("LIVEKIT_URL manquante (ex: https://<sous-domaine>.livekit.cloud)");
    if (!API_KEY || !API_SECRET)
      throw new Error("LIVEKIT_API_KEY / LIVEKIT_API_SECRET manquants");

    if (EXPECT_HOST && hostOf(wsUrl) !== EXPECT_HOST) {
      wsUrl = "wss://" + EXPECT_HOST;
    }

    const bodyText = await req.text();
    let body = {};
    try {
      if (bodyText) body = JSON.parse(bodyText);
    } catch {
      const p = new URLSearchParams(bodyText);
      body = Object.fromEntries(p.entries());
    }

    const rawRoom = body.room || body.roomName || body.conversationId || body.convId;
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
    const payload = decodeJwt(token);

    if (payload?.iss !== API_KEY) {
      throw new Error(
        `LIVEKIT_TOKEN_MISMATCH: iss=${payload?.iss || "null"} != API_KEY=${String(API_KEY).slice(0, 8)}…`
      );
    }

    return NextResponse.json(
      {
        success: true,
        token,
        wsUrl,
        identity,
        room,
        _diag: {
          iss: payload?.iss,
          video: payload?.video,
          room: payload?.video?.room || payload?.room,
          nbf: payload?.nbf,
          exp: payload?.exp,
        },
      },
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
