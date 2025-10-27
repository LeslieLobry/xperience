// /app/api/cron/reminder-profile/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { resend } from "../../../../lib/resend";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ------- auth utils ------- */
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
  const q = url.searchParams.get("token") || url.searchParams.get("secret") || "";
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";

  return safeEqual(bearer, secret) || safeEqual(q, secret) || (isVercelCron && safeEqual(q, secret));
}
const esc = (s = "") =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ------- core ------- */
async function runJob(req, { dry = false } = {}) {
  try {
    const origin = process.env.NEXT_PUBLIC_URL || new URL(req.url).origin;
    const RAW_FROM = process.env.EMAIL_FROM || "no-reply@x-periences.fr";
    const FROM = /<[^>]+>/.test(RAW_FROM) ? RAW_FROM : `Xpérience <${RAW_FROM}>`;

    const now = Date.now();
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);
    const BATCH = 500;

    // En dry mode, on n'exige pas la clé Resend
    if (!dry && !process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "RESEND_API_KEY absente (prod)" },
        { status: 500 }
      );
    }

    // ✅ Filtre robuste: "différent de true" (couvre false ET null)
    const candidates = await prisma.utilisateur.findMany({
      where: {
        createdAt: { lte: twentyFourHoursAgo },
        AND: [{ NOT: { profilComplet: true } }, { NOT: { reminderSent: true } }],
        email: { not: null },
      },
      select: { id: true, email: true, pseudo: true },
      take: BATCH,
    });

    if (dry) {
      return NextResponse.json({
        ok: true,
        dry: true,
        from: FROM,
        count: candidates.length,
        sample: candidates.slice(0, 10),
      });
    }

    if (!candidates.length) {
      return NextResponse.json({ ok: true, sent: 0, info: "No candidates" });
    }

    // Lock optimiste: ne locke que ceux qui ne sont pas déjà à true
    const ids = candidates.map((u) => u.id);
    const lock = await prisma.utilisateur.updateMany({
      where: { id: { in: ids }, NOT: { reminderSent: true } },
      data: { reminderSent: true },
    });

    let sent = 0;
    const actuallySent = [];

    for (const user of candidates) {
      try {
        const pseudo = user.pseudo || "";
        const html = `
          <div style="font-family: Raleway, Arial, sans-serif; color: #1a1a1a; font-size: 16px; line-height: 1.6; background: #f7f8fa; padding: 32px 24px;">
            <div style="text-align:center; margin-bottom: 18px;">
              <img src="${origin}/logo.png" alt="Xpérience" style="height:60px;"/>
            </div>
            <h2 style="font-weight:700; color:#1a1a1a; margin-bottom: 0.7em;">Bonjour ${esc(pseudo)},</h2>
            <p>Vous êtes inscrit sur <b>Xpérience</b>, mais votre profil n’est pas encore complété…</p>
            <p style="margin-top:1em;">✨ Pour commencer à échanger et vivre des rencontres élégantes, complétez votre profil pour être bien visible.</p>
            <div style="margin:2em 0;">
              <a href="${origin}/accueil-page" style="display:inline-block;background:#1a1a1a;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:18px;letter-spacing:1px;">➡️ Compléter mon profil maintenant</a>
            </div>
            <p style="margin-top:1.5em;">🎁 <b>Bonus</b> : les profils complets sont mis en avant automatiquement dans les recherches !</p>
            <p style="margin-top:2.5em;">À très vite sur <a href="${origin}" style="color:#0070f3;text-decoration:underline;">x-periences.fr</a><br><b>L’équipe Xpérience</b></p>
          </div>
        `;

        const r = await resend.emails.send({
          from: FROM,
          to: user.email,
          subject: "Il ne vous reste qu’une étape pour vivre de vraies Xpériences…",
          html,
          text: `Bonjour ${pseudo},

Vous êtes inscrit sur Xpérience, mais votre profil n’est pas encore complété.
Complétez votre profil pour être bien visible et commencer à échanger.

→ ${origin}/accueil-page

— L’équipe Xpérience`,
          headers: { "List-Unsubscribe": `<${origin}/parametres/notifications>` },
        });

        if (r?.error) {
          console.error("[reminder-profile] Resend error:", user.email, r.error);
          // rollback pour retenter plus tard
          await prisma.utilisateur.update({
            where: { id: user.id },
            data: { reminderSent: false },
          });
          continue;
        }

        console.log("[reminder-profile] sent ok:", user.email, r?.data?.id);
        sent++;
        actuallySent.push(user);
      } catch (e) {
        console.error("[reminder-profile] exception:", user.email, e);
        await prisma.utilisateur.update({
          where: { id: user.id },
          data: { reminderSent: false },
        });
      }
    }

    return NextResponse.json({
      ok: true,
      sent,
      totalCandidates: candidates.length,
      locked: lock?.count || 0,
    });
  } catch (err) {
    console.error("[reminder-profile] FATAL:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}

/* ------- handlers ------- */
export async function GET(req) {
  if (!hasValidAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  return runJob(req, { dry });
}

export async function POST(req) {
  if (!hasValidAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return runJob(req, { dry: false });
}
