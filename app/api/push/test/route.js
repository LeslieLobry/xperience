import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import jwt from "jsonwebtoken";
import { sendExpoPush } from "../../../../lib/expoPush";

export const runtime = "nodejs";
const JWT_SECRET = process.env.JWT_SECRET;

function getUserIdFromBearer(req) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload?.id ? Number(payload.id) : null;
  } catch {
    return null;
  }
}

export async function POST(req) {
  try {
    const userId = getUserIdFromBearer(req);
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.utilisateur.findUnique({
      where: { id: userId },
      select: { expoPushToken: true, pushEnabled: true },
    });

    if (!user?.pushEnabled) {
      return NextResponse.json({ success: false, error: "Push disabled for this user" }, { status: 400 });
    }

    if (!user?.expoPushToken) {
      return NextResponse.json({ success: false, error: "No expoPushToken saved" }, { status: 400 });
    }

    const result = await sendExpoPush({
      to: user.expoPushToken,
      title: "Test push ✅",
      body: "Si tu vois ça app fermée, c’est OK.",
      data: { type: "test" },
    });

    return NextResponse.json({ success: true, result });
  } catch (e) {
    console.error("❌ /api/push/test error:", e);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
