import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Lis les env (serveur). LIVEKIT_URL doit commencer par wss://
const LIVEKIT_URL =
  process.env.LIVEKIT_URL ||
  process.env.LIVEKIT_WS_URL ||
  process.env.NEXT_PUBLIC_LIVEKIT_URL;

const API_KEY =
  process.env.LIVEKIT_API_KEY || process.env.LIVEKIT_KEY;

const API_SECRET =
  process.env.LIVEKIT_API_SECRET || process.env.LIVEKIT_SECRET;

function buildJwt(identity, room, ttl = "10m") {
  if (!API_KEY || !API_SECRET) {
    throw new Error("LIVEKIT_API_KEY / LIVEKIT_API_SECRET manquants");
  }
  const at = new AccessToken(API_KEY, API_SECRET, {
    identity: String(identity || ""),
    ttl,
  });
  at.addGrant({
    roomJoin: true,
    room: String(room),
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  return at.toJwt(); // ⬅️ renvoie une STRING (JWT)
}

// GET /api/livekit/token?room=...&identity=... (alias: conversationId / userId)
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    if (searchParams.get("diag") === "1") {
      return NextResponse.json({
        hasUrl: !!LIVEKIT_URL, hasKey: !!API_KEY, hasSecret: !!API_SECRET, runtime: "nodejs",
      });
    }

    const room = searchParams.get("room") || searchParams.get("conversationId");
    const identity = searchParams.get("identity") || searchParams.get("userId") || "user-anon";

    if (!LIVEKIT_URL) throw new Error("LIVEKIT_URL manquante (wss://…)");
    if (!room) return NextResponse.json({ success: false, error: "room/conversationId requis" }, { status: 400 });

    const token = await buildJwt(identity, room);
    return NextResponse.json({ success: true, token, wsUrl: LIVEKIT_URL }, { status: 200 });
  } catch (e) {
    console.error("[livekit/token][GET]", e);
    return NextResponse.json({ success: false, error: e?.message || "Token build failed" }, { status: 500 });
  }
}

// POST { room|conversationId, identity|userId }
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const room = body.room || body.conversationId;
    const identity = body.identity || body.userId || "user-anon";

    if (!LIVEKIT_URL) throw new Error("LIVEKIT_URL manquante (wss://…)");
    if (!room) return NextResponse.json({ success: false, error: "room/conversationId requis" }, { status: 400 });

    const token = await buildJwt(identity, room);
    return NextResponse.json({ success: true, token, wsUrl: LIVEKIT_URL }, { status: 200 });
  } catch (e) {
    console.error("[livekit/token][POST]", e);
    return NextResponse.json({ success: false, error: e?.message || "Token build failed" }, { status: 500 });
  }
}
