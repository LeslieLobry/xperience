// app/api/livekit/selfcheck/route.js
import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL;            // https://xperiences-6q6jj78.livekit.cloud
const API_KEY     = process.env.LIVEKIT_API_KEY;
const API_SECRET  = process.env.LIVEKIT_API_SECRET;

export async function GET() {
  try {
    if (!LIVEKIT_URL || !API_KEY || !API_SECRET) throw new Error("ENV manquantes");

    const at = new AccessToken(API_KEY, API_SECRET, { identity: "diag-user", ttl: 300 });
    at.addGrant({ roomJoin: true, room: "conversation-999", canPublish: true, canSubscribe: true });
    const token = await at.toJwt();

    const wsBase = LIVEKIT_URL.replace(/^https?:\/\//, "https://").replace(/\/+$/, "");
    const url = `${wsBase}/rtc/validate?access_token=${encodeURIComponent(token)}`;
    const r = await fetch(url, { method: "GET" });

    return NextResponse.json({
      wsBase, keyPrefix: API_KEY.slice(0,8),
      validateStatus: r.status, ok: r.ok
    });
  } catch (e) {
    return NextResponse.json({ ok:false, error: e.message }, { status: 500 });
  }
}
