import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../lib/prisma";
import { signAccessToken, rotateRefreshToken } from "../../../../lib/tokens";

export async function POST(req) {
  try {
    const { email, password, deviceId = "mobile" } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }
    const user = await prisma.utilisateur.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: "Invalid login" }, { status: 401 });

    const ok = await bcrypt.compare(password, user.motDePasseHash);
    if (!ok) return NextResponse.json({ error: "Invalid login" }, { status: 401 });

    const accessToken = signAccessToken(user);
    const refreshToken = await rotateRefreshToken(user.id, deviceId);

    return NextResponse.json({
      accessToken,
      refreshToken,
      user: { id: user.id, pseudo: user.pseudo, role: user.role }
    });
  } catch (e) {
    console.error("mobile login error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
