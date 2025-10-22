// /api/livekit/token/route.js
import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const LIVEKIT_URL =
  process.env.LIVEKIT_URL ||
  process.env.LIVEKIT_WS_URL ||
  process.env.NEXT_PUBLIC_LIVEKIT_URL;

const API_KEY = process.env.LIVEKIT_API_KEY || process.env.LIVEKIT_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET || process.env.LIVEKIT_SECRET;

/* ============================================================
 *  UTILS
 * ============================================================ */
function normalizeWs(url) {
  if (!url) return null;
  let u = String(url).trim();
  if (u.startsWith("http://")) u = u.replace("http://", "ws://");
  if (u.startsWith("https://")) u = u.replace("https://", "wss://");
  if (!u.startsWith("ws://") && !u.startsWith("wss://"))
    u = "wss://" + u.replace(/^\/+/, "");
  return u;
}

function sanitizeIdentity(id) {
  return String(id || "").trim().replace(/\s+/g, "_").slice(0, 128);
}

function makeIdentity(base) {
  let s = String(base ?? "user-anon").trim();
  if (/^\d+$/.test(s)) s = `user-${s}`;
  return sanitizeIdentity(s);
}

// ✅ Nouvelle fonction : garantit un format stable pour la room
function normalizeRoom(input) {
  if (!input) return null;
  const s = String(input).trim();
  if (/^\d+$/.test(s)) return `conversation-${s}`;
  if (/^conversation-/.test(s)) return s;
  return s;
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

/* ============================================================
 *  GET
 * ============================================================ */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    if (searchParams.get("diag") === "1") {
      return NextResponse.json({
        hasUrl: !!LIVEKIT_URL,
        hasKey: !!API_KEY,
        hasSecret: !!API_SECRET,
        runtime: "nodejs",
        wsUrl: normalizeWs(LIVEKIT_URL) || null,
      });
    }

    const wsUrl = normalizeWs(LIVEKIT_URL);
    if (!wsUrl) throw new Error("LIVEKIT_URL manquante (wss://…)");

    const rawRoom =
      searchParams.get("room") ||
      searchParams.get("roomName") ||
      searchParams.get("conversationId");
    const room = normalizeRoom(rawRoom);

    if (!room) {
      return NextResponse.json(
        { success: false, error: "room/conversationId requis" },
        { status: 400 }
      );
    }

    const identityBase =
      searchParams.get("identity") ||
      searchParams.get("userId") ||
      "user-anon";
    const identity = makeIdentity(identityBase);

    const token = await buildJwt({ identity, room, ttlSec: 600 });

    console.log("[LIVEKIT][GET]", { room, identity }); // debug simple

    return NextResponse.json(
      { success: true, token, wsUrl, identity, room },
      { status: 200 }
    );
  } catch (e) {
    console.error("[livekit/token][GET]", e);
    return NextResponse.json(
      { success: false, error: e?.message || "Token build failed" },
      { status: 500 }
    );
  }
}

/* ============================================================
 *  POST
 * ============================================================ */
export async function POST(req) {
  try {
    const wsUrl = normalizeWs(LIVEKIT_URL);
    if (!wsUrl) throw new Error("LIVEKIT_URL manquante (wss://…)");

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
        { status: 400 }
      );
    }

    const identityBase = body.identity || body.userId || "user-anon";
    const name = body.name || undefined;
    const identity = makeIdentity(identityBase);

    const token = await buildJwt({ identity, room, ttlSec: 600, name });

    console.log("[LIVEKIT][POST]", { room, identity }); // debug simple

    return NextResponse.json(
      { success: true, token, wsUrl, identity, room },
      { status: 200 }
    );
  } catch (e) {
    console.error("[livekit/token][POST]", e);
    return NextResponse.json(
      { success: false, error: e?.message || "Token build failed" },
      { status: 500 }
    );
  }
}
