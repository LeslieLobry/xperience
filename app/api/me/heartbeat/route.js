// app/api/me/heartbeat/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic"; // pas de cache edge

const secret = process.env.JWT_SECRET;

function json(data, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isVercelScreenshot(req) {
  const ua = req.headers.get("user-agent") || "";
  return /vercel-screenshot/i.test(ua);
}

export async function POST(req) {
  try {
    // 1) Bot vercel-screenshot → no-op silencieux (pas de 401 dans les logs)
    if (isVercelScreenshot(req)) {
      return json({ ok: true, bot: "vercel-screenshot" }, 200);
    }

    // 2) Lecture cookie (⚠️ pas async)
    const token = cookies().get("token")?.value;

    // 3) Pas d’auth → 200 neutre (évite bruit/401)
    if (!token || !secret) {
      return json({ ok: true, auth: false, reason: "no_token" }, 200);
    }

    // 4) Vérif JWT
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch {
      return json({ ok: true, auth: false, reason: "invalid_token" }, 200);
    }

    // 5) Met à jour la date de dernière activité
    await prisma.utilisateur.update({
      where: { id: decoded.id },
      data: { lastSeenAt: new Date() },
    });

    return json({ ok: true, auth: true }, 200);
  } catch (e) {
    console.error("POST /api/me/heartbeat error:", e);
    return json({ ok: false, error: "server_error" }, 500);
  }
}

// (Optionnel) GET neutre si tu testes à la main
export async function GET(req) {
  if (isVercelScreenshot(req)) {
    return json({ ok: true, bot: "vercel-screenshot" }, 200);
  }
  return json({ ok: true, msg: "heartbeat endpoint" }, 200);
}
