import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;

export async function POST(req) {
  try {
    const { identity, room } = await req.json();

if (!identity || !room) {
  return NextResponse.json({ error: "Missing user or room" }, { status: 400 });
}
console.log("✅ API_KEY:", !!API_KEY);
console.log("✅ API_SECRET:", !!API_SECRET);
console.log("✅ identity reçu:", identity);
console.log("🎟️ Token demandé pour : identity =", identity, "| room =", room);

    const token = new AccessToken(API_KEY, API_SECRET, {
      identity,
      ttl: "10m",
    });

    token.addGrant({ roomJoin: true, room });

    const jwt = await token.toJwt(); // ✅ indispensable
    return NextResponse.json({ token: jwt });
  } catch (err) {
    console.error("❌ Erreur LiveKit Token:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
