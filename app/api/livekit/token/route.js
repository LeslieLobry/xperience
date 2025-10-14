// /api/livekit/token/route.js

import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const LIVEKIT_URL =
  process.env.LIVEKIT_URL ||
  process.env.LIVEKIT_WS_URL ||
  process.env.NEXT_PUBLIC_LIVEKIT_URL;

const API_KEY = process.env.LIVEKIT_API_KEY || process.env.LIVEKIT_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET || process.env.LIVEKIT_SECRET;

// --- util: normaliser wss://
function normalizeWs(url) {
  if (!url) return null;
  let u = String(url).trim();
  if (u.startsWith("http://")) u = u.replace("http://", "ws://");
  if (u.startsWith("https://")) u = u.replace("https://", "wss://");
  if (!u.startsWith("ws://") && !u.startsWith("wss://")) u = "wss://" + u.replace(/^\/+/, "");
  return u;
}

function buildJwt(identity, room, ttl = "10m") {
  if (!API_KEY || !API_SECRET) throw new Error("LIVEKIT_API_KEY / LIVEKIT_API_SECRET manquants");
  const at = new AccessToken(API_KEY, API_SECRET, { identity: String(identity), ttl });
  at.addGrant({
    roomJoin: true,
    room: String(room),
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  return at.toJwt();
}

// Fabrique une identity **unique** en suffixant avec un device/session id
function makeUniqueIdentity(baseIdentity, deviceId) {
  const dev = (deviceId || "").trim() || randomUUID(); // si pas fourni, on évite le clash quand même
  // si déjà suffixée, on ne double pas (ex: "42:abcd")
  if (baseIdentity.includes(":")) return baseIdentity;
  return `${baseIdentity}:${dev}`;
}

// GET /api/livekit/token?room=...&identity=...
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    if (searchParams.get("diag") === "1") {
      return NextResponse.json({
        hasUrl: !!LIVEKIT_URL,
        hasKey: !!API_KEY,
        hasSecret: !!API_SECRET,
        runtime: "nodejs",
      });
    }

    const rawUrl = normalizeWs(LIVEKIT_URL);
    if (!rawUrl) throw new Error("LIVEKIT_URL manquante (wss://…)");

    const room = searchParams.get("room") || searchParams.get("conversationId");
    if (!room)
      return NextResponse.json(
        { success: false, error: "room/conversationId requis" },
        { status: 400 }
      );

    const identityBase = searchParams.get("identity") || searchParams.get("userId") || "user-anon";
    // Pour GET, on ne reçoit pas d’en-tête x-device-id → on met un suffixe UUID pour éviter les clashes multi-onglets
    const identity = makeUniqueIdentity(identityBase);

    const token = await buildJwt(identity, room);
    return NextResponse.json({ success: true, token, wsUrl: rawUrl, identity }, { status: 200 });
  } catch (e) {
    console.error("[livekit/token][GET]", e);
    return NextResponse.json(
      { success: false, error: e?.message || "Token build failed" },
      { status: 500 }
    );
  }
}

// POST { room|conversationId } + header x-device-id (recommandé sur mobile)
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawUrl = normalizeWs(LIVEKIT_URL);
    if (!rawUrl) throw new Error("LIVEKIT_URL manquante (wss://…)");

    const room = body.room || body.conversationId;
    if (!room)
      return NextResponse.json(
        { success: false, error: "room/conversationId requis" },
        { status: 400 }
      );

    // côté mobile, on enverra x-device-id; sinon on génère
    const deviceId = req.headers.get("x-device-id") || undefined;

    // si le client envoie identity, on la respecte mais on la rend unique
    const identityBase = body.identity || body.userId || "user-anon";
    const identity = makeUniqueIdentity(identityBase, deviceId);

    const token = await buildJwt(identity, room);
    return NextResponse.json({ success: true, token, wsUrl: rawUrl, identity }, { status: 200 });
  } catch (e) {
    console.error("[livekit/token][POST]", e);
    return NextResponse.json(
      { success: false, error: e?.message || "Token build failed" },
      { status: 500 }
    );
  }
}
