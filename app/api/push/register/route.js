import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import jwt from "jsonwebtoken";

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
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const expoPushToken = body?.expoPushToken || body?.token; // ✅ accepte les 2
    const pushEnabled = body?.pushEnabled;

    if (!expoPushToken || typeof expoPushToken !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing expoPushToken" },
        { status: 400 }
      );
    }

    await prisma.utilisateur.update({
      where: { id: userId },
      data: {
        expoPushToken,
        ...(typeof pushEnabled === "boolean" ? { pushEnabled } : {}),
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("❌ /api/push/register error:", e);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const userId = getUserIdFromBearer(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await prisma.utilisateur.update({
      where: { id: userId },
      data: {
        expoPushToken: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("❌ /api/push/register DELETE error:", e);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
