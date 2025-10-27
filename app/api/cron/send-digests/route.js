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

/* ------- petit helper HTML ------- */
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

/* ------- core ------- */
async function runJob(req, { dry = false } = {}) {
  try {
    const origin = process.env.NEXT_PUBLIC_URL || new URL(req.url).origin;
    const RAW_FROM = process.env.EMAIL_FROM || "noreply@x-periences.fr";
    const FROM = /<[^>]+>/.test(RAW_FROM) ? RAW_FROM : `Xperiences <${RAW_FROM}>`;

    const now = Date.now();
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);
    const BATCH = 500;

    // En dry mode, on ne bloque pas si la clé manque (diagnostic uniquement)
    if (!dry && !process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "RESEND_API_KEY absente (prod)" },
        { status: 500 }
      );
    }

    /**
     * 🎯 QUI RECEVRA LE DIGEST ?
     * - Exemple générique et safe :
     *   - utilisateurs avec email vérifié (emailVerified != null)
     *   - actifs récemment (lastSeenAt dans les 60 jours) — optionnel
     *   - pas de filtre sur des champs possiblement NULL non-nullable
     *
     * 💡 Adapte ce WHERE à ta logique métier si tu as un flag "digestEnabled" par ex.
     */
    const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000);
    const candidates = await prisma.utilisateur.findMany({
      where: {
        // email vérifié (souvent un DateTime nullable) → "différent de null"
        NOT: { emailVerified: null },
        // optionnel : présents dans les 60 derniers jours
        OR: [{ lastSeenAt: { gte: sixtyDaysAgo } }, { lastSeenAt: null }],
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

    /**
     * 🧠 CONTENU DU DIGEST
     * Ici, on envoie un digest simple “nouveautés des dernières 24h”.
     * Remplace la partie "stats" par tes vraies données si besoin (messages non lus, nouveaux profils, événements…).
     * Le code ci-dessous est volontairement générique pour fonctionner même sans tables spécifiques.
     */

    // Exemple de “stats” bidon (remplace par des requêtes réelles si tu veux)
    const stats = {
      nouveauxProfils: 0,
      nouveauxArticles: 0,
      prochainsEvenements: 0,
    };

    let sent = 0;

    for (const u of candidates) {
      try {
        const title = `Votre digest Xpérience — dernières 24h`;
        const bodyHtml = `
          <p>Bonjour ${esc(u.pseudo || "")}, voici un rapide aperçu des nouveautés :</p>
          <ul>
            <li>Nouveaux profils : <b>${stats.nouveauxProfils}</b></li>
            <li>Articles publiés : <b>${stats.nouveauxArticles}</b></li>
            <li>Événements à venir : <b>${stats.prochainsEvenements}</b></li>
          </ul>
          <div style="margin:20px 0;">
            <a href="${origin}/accueil-page"
               style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600;">
              Ouvrir Xpérience
            </a>
          </div>
        `;

        const r = await resend.emails.send({
          from: FROM,
          to: u.email,
          subject: "Votre digest Xpérience",
          html: layout({ origin, title, bodyHtml }),
          text:
            `Bonjour ${u.pseudo || ""},\n\n` +
            `Voici votre digest des dernières 24h sur Xpérience.\n` +
            `Ouvrir : ${origin}/accueil-page\n\n` +
            `— L’équipe Xpérience`,
          headers: {
            "List-Unsubscribe": `<${origin}/parametres/notifications>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            // "Reply-To": "contact@x-periences.fr", // optionnel
          },
        });

        if (r?.error) {
          console.error("[send-digests] Resend error:", u.email, r.error);
          continue;
        }

        console.log("[send-digests] sent ok:", u.email, r?.data?.id);
        sent++;
      } catch (e) {
        console.error("[send-digests] exception:", u.email, e);
      }
    }

    return NextResponse.json({
      ok: true,
      sent,
      totalCandidates: candidates.length,
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
  // dry=1 pour tester sans envoyer
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  return runJob(req, { dry });
}

export async function POST(req) {
  if (!hasValidAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return runJob(req, { dry: false });
}
