import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import {
  signAccessToken,
  validateRefreshToken,
  rotateRefreshToken
} from "../../../../lib/tokens";

export async function POST(req) {
  try {
    const { userId, deviceId = "mobile", refreshToken } = await req.json();
    if (!userId || !refreshToken) {
      return NextResponse.json({ error: "Missing payload" }, { status: 400 });
    }
    const isValid = await validateRefreshToken(userId, deviceId, refreshToken);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid refresh" }, { status: 401 });
    }
    const user = await prisma.utilisateur.findUnique({ where: { id: Number(userId) } });
    if (!user) return NextResponse.json({ error: "User missing" }, { status: 404 });

    const accessToken = signAccessToken(user);
    const newRefresh = await rotateRefreshToken(user.id, deviceId);

    return NextResponse.json({ accessToken, refreshToken: newRefresh });
  } catch (e) {
    console.error("mobile refresh error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
