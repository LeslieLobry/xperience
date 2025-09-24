// app/api/livekit/token/route.ts  (ou .js si tu n'utilises pas TS)

import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

const API_KEY = process.env.LIVEKIT_API_KEY!;
const API_SECRET = process.env.LIVEKIT_API_SECRET!;
// ⚠️ Mets ici ton URL LiveKit Cloud ou serveur self-hosté (wss://…)
const LIVEKIT_URL = process.env.LIVEKIT_URL || process.env.LIVEKIT_WS_URL;

function buildToken(identity: string, room: string) {
  const at = new AccessToken(API_KEY, API_SECRET, {
    identity,     // ex: "user_123"
    ttl: "10m",   // token valable 10 minutes
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const identity = searchParams.get("identity") || "anon";
    const room = searchParams.get("room") || searchParams.get("conversationId");
    const audioOnly = searchParams.get("audioOnly") === "1";

    if (!room) {
      return NextResponse.json({ error: "Missing room" }, { status: 400 });
    }
    if (!LIVEKIT_URL) {
      return NextResponse.json({ error: "LIVEKIT_URL not configured" }, { status: 500 });
    }

    const token = await buildToken(`user_${identity}`, room);
    return NextResponse.json({
      token,
      url: LIVEKIT_URL,
      room,
      audioOnly,
      identity: `user_${identity}`,
    });
  } catch (err) {
    console.error("❌ LiveKit token GET:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const identity = body?.identity || "anon";
    const room = body?.room || body?.conversationId;
    const audioOnly = !!body?.audioOnly;

    if (!room) {
      return NextResponse.json({ error: "Missing room" }, { status: 400 });
    }
    if (!LIVEKIT_URL) {
      return NextResponse.json({ error: "LIVEKIT_URL not configured" }, { status: 500 });
    }

    const token = await buildToken(`user_${identity}`, room);
    return NextResponse.json({
      token,
      url: LIVEKIT_URL,
      room,
      audioOnly,
      identity: `user_${identity}`,
    });
  } catch (err) {
    console.error("❌ LiveKit token POST:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
