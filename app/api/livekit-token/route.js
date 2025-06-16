import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

// ❌ Ne mets jamais un secret dans NEXT_PUBLIC_
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const identity = searchParams.get("user");
  const room = searchParams.get("room") || "default";

  if (!identity) {
    return NextResponse.json({ error: "Missing user" }, { status: 400 });
  }

  const at = new AccessToken(API_KEY, API_SECRET, {
    identity,
    ttl: "10m",
  });

  at.addGrant({ roomJoin: true, room });

  const token = await at.toJwt();
  return NextResponse.json({ token });
}
