// /app/api/cron/send-digests/route.js
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

/* ------- layout ------- */
function layout({ origin, title, bodyHtml }) {
  return `
  <div style="font-family: Raleway, Arial, sans-serif; color:#1a1a1a; font-size:16px; line-height:1.6; background:#f7f8fa; padding:32px 24px;">
    <div style="text-align:center; margin-bottom:18px;">
      <img src="${origin}/logo.png" alt="Xpérience" style="height:60px;"/>
    </div>
    <h2 style="font-weight:700; margin:0 0 12px;">${esc(title)}</h2>
    ${bodyHtml}
    <p style="margin-top:24px; font-size:13px; color:#777">
      — L’équipe Xpérience • <a href="${origin}/parametres/notifications">Gérer mes emails</a>
    </p>
  </div>`;
}

/* ------- batch helpers (anti-429) ------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function chunk(arr, size = 100) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
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

      if (!is429 || attempt >= maxRetries) throw err;

      let retryAfter = null;
      try {
        const h = err?.response?.headers;
        if (typeof h?.get === "function") retryAfter = Number(h.get("retry-after")) || null;
        else if (h && typeof h["retry-after"] !== "undefined") retryAfter = Number(h["retry-after"]) || null;
      } catch {}

      const backoff = retryAfter
        ? retryAfter * 1000
        : Math.min(2000, 300 * 2 ** attempt) + Math.floor(Math.random() * 200);

      attempt++;
      await sleep(backoff);
    }
  }
}

/* ------- compteurs alignés à TON schéma ------- */
async function countNewMessagesForUser(userId, since) {
  try {
    return await prisma.message.count({
      where: {
        createdAt: { gte: since },
        auteurId: { not: userId }, // reçu (pas écrit par le user)
        conversation: {
          participants: { some: { utilisateurId: userId } },
        },
      },
    });
  } catch {
    return 0;
  }
}

async function countNewVisitsForUser(userId, since) {
  try {
    return await prisma.visiteProfil.count({
      where: {
        visiteId: userId,      // cible visitée
        date: { gte: since },  // champ = "date" (pas createdAt)
      },
    });
  } catch {
    return 0;
  }
}

async function countNewLikesForUser(userId, since) {
  try {
    return await prisma.like.count({
      where: {
        cibleId: userId,
        createdAt: { gte: since },
      },
    });
  } catch {
    return 0;
  }
}

/* ------- core ------- */
async function runJob(req, { dry = false } = {}) {
  try {
    const origin = process.env.NEXT_PUBLIC_URL || new URL(req.url).origin;
    const RAW_FROM = process.env.EMAIL_FROM || "noreply@x-periences.fr";
    const FROM = /<[^>]+>/.test(RAW_FROM) ? RAW_FROM : `Xperiences <${RAW_FROM}>`;

    const now = Date.now();
    const since = new Date(now - 24 * 60 * 60 * 1000);

    if (!dry && !process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "RESEND_API_KEY absente (prod)" },
        { status: 500 }
      );
    }

    // Emails vérifiés et actifs 60 jours (ou lastSeenAt null)
    const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000);
    const DB_TAKE = 500;
    const candidates = await prisma.utilisateur.findMany({
      where: {
        NOT: { emailVerified: null },
        OR: [{ lastSeenAt: { gte: sixtyDaysAgo } }, { lastSeenAt: null }],
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

    const MAX_BATCH_SIZE = 100;
    const THROTTLE_BETWEEN_BATCHES = 700;

    const personalized = [];
    for (const u of candidates) {
      const [messagesRecus, visitesRecues, likesRecus] = await Promise.all([
        countNewMessagesForUser(u.id, since),
        countNewVisitsForUser(u.id, since),
        countNewLikesForUser(u.id, since),
      ]);

      if ((messagesRecus || 0) + (visitesRecues || 0) + (likesRecus || 0) === 0) continue;

      const title = `Votre activité des dernières 24h`;
      const bodyHtml = `
        <p>Bonjour ${esc(u.pseudo || "")}, voici ce qui s’est passé ces dernières 24&nbsp;heures :</p>
        <ul>
          <li>Nouveaux <b>messages reçus</b> : <b>${messagesRecus}</b></li>
          <li>Nouvelles <b>visites de profil</b> : <b>${visitesRecues}</b></li>
          <li>Nouveaux <b>likes</b> : <b>${likesRecus}</b></li>
        </ul>
        <div style="margin:20px 0;">
          <a href="${origin}/accueil-page"
             style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600;">
            Ouvrir Xpérience
          </a>
        </div>
      `;
      const text = `Bonjour ${u.pseudo || ""},

Voici votre activité des dernières 24h sur Xpérience :
- Messages reçus : ${messagesRecus}
- Visites de profil : ${visitesRecues}
- Likes : ${likesRecus}

Ouvrir : ${origin}/accueil

— L’équipe Xpérience`;

      personalized.push({
        from: FROM,
        to: [u.email],
        subject: "Votre activité sur Xpérience — 24h",
        html: layout({ origin, title, bodyHtml }),
        text,
        headers: {
          "List-Unsubscribe": `<${origin}/parametres/notifications>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
    }

    if (!personalized.length) {
      return NextResponse.json({
        ok: true,
        sent: 0,
        skipped: candidates.length,
        info: "Aucune activité à notifier",
      });
    }

    const groups = chunk(personalized, MAX_BATCH_SIZE);
    let sent = 0;
    let failed = 0;

    for (let g = 0; g < groups.length; g++) {
      const messages = groups[g];
      try {
        const res = await sendBatchWithRetry(messages);
        const results = res?.data && Array.isArray(res.data) ? res.data : null;

        if (results) {
          for (let i = 0; i < results.length; i++) {
            const r = results[i];
            if (r?.id && !r?.error) sent++;
            else failed++;
          }
        } else {
          sent += messages.length;
        }
      } catch (e) {
        failed += messages.length;
        console.error("[send-digests] batch failed:", e);
      }

      if (g < groups.length - 1) {
        await sleep(THROTTLE_BETWEEN_BATCHES);
      }
    }

    return NextResponse.json({
      ok: true,
      sent,
      failed,
      considered: candidates.length,
      batches: groups.length,
    });
  } catch (err) {
    console.error("[send-digests] FATAL:", err);
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
