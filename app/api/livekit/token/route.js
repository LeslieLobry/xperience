// /api/livekit/token/route.js
import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ===================== ENV ===================== */
const LIVEKIT_URL =
  process.env.LIVEKIT_URL ||
  process.env.LIVEKIT_WS_URL ||
  process.env.NEXT_PUBLIC_LIVEKIT_URL;

const API_KEY = process.env.LIVEKIT_API_KEY || process.env.LIVEKIT_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET || process.env.LIVEKIT_SECRET;

/* ===================== UTILS ===================== */
const TAG = "[LIVEKIT_TOKEN]";

function normalizeWs(url) {
  if (!url) return null;
  let u = String(url).trim();
  if (u.startsWith("http://")) u = u.replace("http://", "ws://");
  if (u.startsWith("https://")) u = u.replace("https://", "wss://");
  if (!u.startsWith("ws://") && !u.startsWith("wss://")) u = "wss://" + u.replace(/^\/+/, "");
  return u;
}

// Sécurise l'identity (et aligne _ -> - pour coller aux "expectedIdentity" côté app)
function sanitizeIdentity(id) {
  return String(id || "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-")
    .slice(0, 128);
}

function makeIdentity(base) {
  let s = String(base ?? "user-anon").trim();
  if (/^\d+$/.test(s)) s = `user-${s}`;
  return sanitizeIdentity(s);
}

async function buildJwt({ identity, room, ttlSec = 600, name }) {
  if (!API_KEY || !API_SECRET) {
    throw new Error("LIVEKIT_API_KEY / LIVEKIT_API_SECRET manquants");
  }
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
  return at.toJwt();
}

/** Construit une room sûre:
 *  1) si conversationId numérique fourni -> "conversation-<id>"
 *  2) sinon, accepte legacy room/roomName UNIQUEMENT si "conversation-<id>"
 */
function resolveRoom({ conversationId, legacyRoom, legacyRoomName }) {
  const conv = conversationId ?? null;
  if (conv != null && /^\d+$/.test(String(conv))) {
    return { room: `conversation-${String(conv).trim()}`, source: "conversationId" };
  }
  const legacy = legacyRoom ?? legacyRoomName ?? null;
  if (legacy && /^conversation-\d+$/.test(String(legacy))) {
    return { room: String(legacy).trim(), source: "legacy" };
  }
  return { room: null, source: "invalid" };
}

/* ===================== GET ===================== */
export async function GET(req) {
  const url = new URL(req.url);
  const qp = url.searchParams;

  try {
    // Diagnostic léger d'env
    if (qp.get("diag") === "1") {
      return NextResponse.json({
        hasUrl: !!LIVEKIT_URL,
        hasKey: !!API_KEY,
        hasSecret: !!API_SECRET,
        runtime: "nodejs",
        wsUrl: normalizeWs(LIVEKIT_URL) || null,
      });
    }

    const debug = qp.get("debug") === "1";
    const wsUrl = normalizeWs(LIVEKIT_URL);
    if (!wsUrl) throw new Error("LIVEKIT_URL manquante (wss://…)");

    // ---- Room sûre
    const { room, source } = resolveRoom({
      conversationId: qp.get("conversationId"),
      legacyRoom: qp.get("room"),
      legacyRoomName: qp.get("roomName"),
    });

    if (!room) {
      const msg = "conversationId requis (ou room='conversation-<id>')";
      if (debug) {
        return NextResponse.json(
          { success: false, error: msg, debug: { source, raw: Object.fromEntries(qp.entries()) } },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: false, error: msg }, { status: 400 });
    }

    // ---- Identity
    const identityBase = qp.get("identity") || qp.get("userId") || "user-anon";
    const identity = makeIdentity(identityBase);
    const name = qp.get("name") || undefined;

    // ---- Token
    const token = await buildJwt({ identity, room, ttlSec: 600, name });

    // ---- Log + réponse
    console.log(TAG, "GET issue", { room, identity, source });
    const payload = { success: true, token, wsUrl, identity, room };
    if (debug) payload.debug = { source };
    return NextResponse.json(payload, { status: 200 });
  } catch (e) {
    console.error(TAG, "GET error:", e);
    return NextResponse.json(
      { success: false, error: e?.message || "Token build failed" },
      { status: 500 }
    );
  }
}

/* ===================== POST ===================== */
export async function POST(req) {
  try {
    const wsUrl = normalizeWs(LIVEKIT_URL);
    if (!wsUrl) throw new Error("LIVEKIT_URL manquante (wss://…)");

    // Body tolerant (JSON ou x-www-form-urlencoded)
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

    const debug = !!body.debug;

    // ---- Room sûre
    const { room, source } = resolveRoom({
      conversationId: body.conversationId ?? body.convId,
      legacyRoom: body.room,
      legacyRoomName: body.roomName,
    });

    if (!room) {
      const msg = "conversationId requis (ou room='conversation-<id>')";
      if (debug) {
        return NextResponse.json(
          { success: false, error: msg, debug: { source, body } },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: false, error: msg }, { status: 400 });
    }

    // ---- Identity
    const identityBase = body.identity || body.userId || "user-anon";
    const identity = makeIdentity(identityBase);
    const name = body.name || undefined;

    // ---- Token
    const token = await buildJwt({ identity, room, ttlSec: 600, name });

    // ---- Log + réponse
    console.log(TAG, "POST issue", { room, identity, source });
    const payload = { success: true, token, wsUrl, identity, room };
    if (debug) payload.debug = { source, received: body };
    return NextResponse.json(payload, { status: 200 });
  } catch (e) {
    console.error(TAG, "POST error:", e);
    return NextResponse.json(
      { success: false, error: e?.message || "Token build failed" },
      { status: 500 }
    );
  }
}
