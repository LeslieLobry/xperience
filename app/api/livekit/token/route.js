// app/api/livekit/token/route.js
import { NextResponse } from "next/server";
import { AccessToken /*, VideoGrant (v1), or VideoGrants (v2)*/ } from "livekit-server-sdk";

// Important: cette route doit tourner en Node.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const LIVEKIT_URL = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL;
const API_KEY = process.env.LIVEKIT_API_KEY || process.env.LIVEKIT_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET || process.env.LIVEKIT_SECRET;

function buildToken(identity, room, ttl = "10m", opts = {}) {
  // opts: { audioOnly?: boolean }
  if (!API_KEY || !API_SECRET) {
    throw new Error("LIVEKIT_API_KEY / LIVEKIT_API_SECRET manquants");
  }

  const at = new AccessToken(API_KEY, API_SECRET, {
    identity: String(identity || ""),
    ttl,
  });

  // Grants compatibles v1 et v2 (selon ta version du SDK)
  // v1:
  // at.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true, canPublishData: true });

  // v2 (si disponible) — on reste générique :
  at.addGrant({
    roomJoin: true,
    room: String(room || "room-xp"),
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    // si "audioOnly", on évite de donner la source caméra
    // certaines versions utilisent canPublishSources: ["microphone"] etc.
  });

  return at.toJwt();
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const identity = searchParams.get("identity") || "user-anon";
    const room = searchParams.get("room") || "room-xp";
    const audioOnly = searchParams.get("audioOnly") === "1";

    if (!LIVEKIT_URL) {
      throw new Error("LIVEKIT_URL manquante (wss://…)");
    }

    const token = buildToken(identity, room, "10m", { audioOnly });

    return NextResponse.json(
      { success: true, token, wsUrl: LIVEKIT_URL },
      { status: 200 }
    );
  } catch (e) {
    console.error("[livekit/token][GET] error:", e);
    return NextResponse.json(
      { success: false, error: e?.message || "Token build failed" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const identity = body.identity || "user-anon";
    const room = body.room || "room-xp";
    const audioOnly = !!body.audioOnly;

    if (!LIVEKIT_URL) {
      throw new Error("LIVEKIT_URL manquante (wss://…)");
    }

    const token = buildToken(identity, room, "10m", { audioOnly });

    return NextResponse.json(
      { success: true, token, wsUrl: LIVEKIT_URL },
      { status: 200 }
    );
  } catch (e) {
    console.error("[livekit/token][POST] error:", e);
    return NextResponse.json(
      { success: false, error: e?.message || "Token build failed" },
      { status: 500 }
    );
  }
}
