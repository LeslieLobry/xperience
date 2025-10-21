// app/api/cron/cleanup-online/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* --- Sécurité (auth via CRON_SECRET) --- */
function safeEqual(a = "", b = "") {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}

function hasValidAuth(req) {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) return false;

  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const url = new URL(req.url);
  const q = url.searchParams.get("token") || "";
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";

  return safeEqual(bearer, secret) || safeEqual(q, secret) || (isVercelCron && safeEqual(q, secret));
}

/* --- Cron principale --- */
export async function POST(req) {
  if (!hasValidAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const OFFLINE_THRESHOLD_MIN = 5; // ← inactif depuis 5 minutes = hors ligne
  const limitDate = new Date(now.getTime() - OFFLINE_THRESHOLD_MIN * 60 * 1000);

  try {
    const res = await prisma.utilisateur.updateMany({
      where: {
        statutAuto: true,
        lastSeenAt: { lt: limitDate },
        statut: "en_ligne",
      },
      data: { statut: "hors_ligne" },
    });

    return NextResponse.json({
      ok: true,
      updated: res.count,
      thresholdMinutes: OFFLINE_THRESHOLD_MIN,
    });
  } catch (err) {
    console.error("❌ Cron cleanup error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// GET → test/dry-run
export async function GET(req) {
  const url = new URL(req.url);
  if (url.searchParams.get("dry") === "1") {
    const now = new Date();
    const OFFLINE_THRESHOLD_MIN = 5;
    const limitDate = new Date(now.getTime() - OFFLINE_THRESHOLD_MIN * 60 * 1000);
    const count = await prisma.utilisateur.count({
      where: {
        statutAuto: true,
        lastSeenAt: { lt: limitDate },
        statut: "en_ligne",
      },
    });
    return NextResponse.json({ ok: true, dry: true, wouldUpdate: count });
  }
  return NextResponse.json({ ok: true, hint: "POST with ?token=CRON_SECRET" });
}
