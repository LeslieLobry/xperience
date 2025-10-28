// /app/api/cron/reminder-profile/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { resend } from "../../../../lib/resend";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ------------------ auth utils ------------------ */
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

/* ------------------ helpers envoi ------------------ */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function chunk(arr, size = 100) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Retry exponentiel + respect d’un éventuel Retry-After */
async function sendBatchWithRetry(messages, { maxRetries = 5 } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await resend.batch.send(messages);
    } catch (err) {
      const is429 =
        err?.name === "rate_limit_exceeded" ||
        err?.statusCode === 429 ||
        err?.code === 429;

      if (!is429 || attempt >= maxRetries) {
        throw err;
      }

      // Retry-After (si disponible) sinon backoff exponentiel + jitter
      let retryAfter = null;
      try {
        const h = err?.response?.headers;
        if (typeof h?.get === "function") {
          retryAfter = Number(h.get("retry-after")) || null;
        } else if (typeof h?.["retry-after"] !== "undefined") {
          retryAfter = Number(h["retry-after"]) || null;
        }
      } catch {}

      const backoff = retryAfter
        ? retryAfter * 1000
        : Math.min(2000, 300 * 2 ** attempt) + Math.floor(Math.random() * 200);

      attempt++;
      await sleep(backoff);
    }
  }
}

/* ------------------ core job ------------------ */
async function runJob(req, { dry = false } = {}) {
  try {
    const origin =
      process.env.NEXT_PUBLIC_URL || new URL(req.url).origin;

    const RAW_FROM = process.env.EMAIL_FROM || "no-reply@x-periences.fr";
    const FROM = /<[^>]+>/.test(RAW_FROM) ? RAW_FROM : `Xpérience <${RAW_FROM}>`;

    const now = Date.now();
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);

    // Envoie par lots de 100 via batch
    const MAX_BATCH_SIZE = 100;     // limite Resend batch
    const THROTTLE_BETWEEN_BATCHES = 700; // ms (2 req/s max côté Resend)
    const DB_TAKE = 500;            // on traite jusqu’à 500 users par run

    if (!dry && !process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "RESEND_API_KEY absente (prod)" },
        { status: 500 }
      );
    }

    // Candidats : comptes de +24h, profil non complet, pas encore rappelés
    const candidates = await prisma.utilisateur.findMany({
      where: {
        createdAt: { lte: twentyFourHoursAgo },
        AND: [{ NOT: { profilComplet: true } }, { NOT: { reminderSent: true } }],
      },
      select: { id: true, email: true, pseudo: true },
      take: DB_TAKE,
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

    // Lock optimiste pour éviter les doublons si le cron se chevauche
    const ids = candidates.map((u) => u.id);
    const lock = await prisma.utilisateur.updateMany({
      where: { id: { in: ids }, NOT: { reminderSent: true } },
      data: { reminderSent: true },
    });

    // Prépare le contenu (HTML/TXT) pour chaque user
    const buildHtml = (pseudo) => `
      <div style="font-family: Raleway, Arial, sans-serif; color: #1a1a1a; font-size: 16px; line-height: 1.6; background: #f7f8fa; padding: 32px 24px;">
        <div style="text-align:center; margin-bottom: 18px;">
          <img src="${origin}/logo.png" alt="Xpérience" style="height:60px;"/>
        </div>
        <h2 style="font-weight:700; color:#1a1a1a; margin-bottom: 0.7em;">Bonjour ${esc(pseudo || "")},</h2>
        <p>Vous êtes inscrit sur <b>Xpérience</b>, mais votre profil n’est pas encore complété…</p>
        <p style="margin-top:1em;">✨ Pour commencer à échanger et vivre des rencontres élégantes, complétez votre profil pour être bien visible.</p>
        <div style="margin:2em 0;">
          <a href="${origin}/accueil-page" style="display:inline-block;background:#1a1a1a;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:18px;letter-spacing:1px;">➡️ Compléter mon profil maintenant</a>
        </div>
        <p style="margin-top:1.5em;">🎁 <b>Bonus</b> : les profils complets sont mis en avant automatiquement dans les recherches !</p>
        <p style="margin-top:2.5em;">À très vite sur <a href="${origin}" style="color:#0070f3;text-decoration:underline;">x-periences.fr</a><br><b>L’équipe Xpérience</b></p>
      </div>
    `;
    const buildText = (pseudo) => `Bonjour ${pseudo || ""},

Vous êtes inscrit sur Xpérience, mais votre profil n’est pas encore complété.
Complétez votre profil pour être bien visible et commencer à échanger.

→ ${origin}/accueil-page

— L’équipe Xpérience`;

    let sent = 0;
    let failed = 0;

    // On crée les lots de 100 messages pour resend.batch.send()
    const groups = chunk(candidates, MAX_BATCH_SIZE);

    for (let g = 0; g < groups.length; g++) {
      const batchUsers = groups[g];

      const messages = batchUsers.map((u) => ({
        from: FROM,
        to: [u.email],
        subject: "Il ne vous reste qu’une étape pour vivre de vraies Xpériences…",
        html: buildHtml(u.pseudo),
        text: buildText(u.pseudo),
        headers: { "List-Unsubscribe": `<${origin}/parametres/notifications>` },
      }));

      try {
        const res = await sendBatchWithRetry(messages);

        // Selon la lib, res peut contenir data pour chaque envoi.
        // On traite prudemment : s’il n’y a pas de détail, on suppose OK pour tout.
        const results = res?.data && Array.isArray(res.data) ? res.data : null;

        if (results) {
          // results[i] correspond à messages[i]
          for (let i = 0; i < results.length; i++) {
            const r = results[i];
            const u = batchUsers[i];
            if (r?.id && !r?.error) {
              sent++;
              // OK: rien à faire, reminderSent reste à true
            } else {
              failed++;
              // rollback ce user pour réessayer au run suivant
              await prisma.utilisateur.update({
                where: { id: u.id },
                data: { reminderSent: false },
              });
            }
          }
        } else {
          // Pas de détail → on considère le lot comme OK
          sent += batchUsers.length;
        }
      } catch (e) {
        // Échec du lot : rollback de tous les users du lot
        failed += batchUsers.length;
        await prisma.utilisateur.updateMany({
          where: { id: { in: batchUsers.map((u) => u.id) } },
          data: { reminderSent: false },
        });
      }

      // Throttle pour rester sous 2 req/s
      if (g < groups.length - 1) {
        await sleep(THROTTLE_BETWEEN_BATCHES);
      }
    }

    return NextResponse.json({
      ok: true,
      totalCandidates: candidates.length,
      locked: lock?.count || 0,
      sent,
      failed,
      batches: groups.length,
    });
  } catch (err) {
    console.error("[reminder-profile] FATAL:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}

/* ------------------ handlers ------------------ */
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
