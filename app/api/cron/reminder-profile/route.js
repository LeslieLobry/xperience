import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { resend } from "../../../../lib/resend";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // impératif pour les env & le SDK

// ----- utils -----
function safeEqual(a = "", b = "") {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}

function hasValidAuth(req) {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) return false;

  // 1) Bearer (curl/cron externe)
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  // 2) Query token (Vercel Scheduled Functions)
  const url = new URL(req.url);
  const q = url.searchParams.get("token") || url.searchParams.get("secret") || "";

  // 3) Indicateur Vercel (facultatif)
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";

  return safeEqual(bearer, secret) || safeEqual(q, secret) || (isVercelCron && safeEqual(q, secret));
}

function htmlEscape(s = "") {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ----- handler -----
export async function POST(req) {
  if (!hasValidAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const origin = process.env.NEXT_PUBLIC_URL || new URL(req.url).origin;

  // ⚠️ EMAIL_FROM doit être une simple adresse (ex: no-reply@x-periences.fr)
  const RAW_FROM = process.env.EMAIL_FROM || "no-reply@x-periences.fr";
  // Si EMAIL_FROM est déjà "Nom <mail>", on le garde tel quel ; sinon on ajoute le nom :
  const FROM = /<[^>]+>/.test(RAW_FROM) ? RAW_FROM : `Xperience <${RAW_FROM}>`;

  const now = Date.now();
  const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);

  // On limite le lot pour éviter un envoi massif en cas de backlog
  const BATCH = 500;

  // 1) Sélectionne les users à relancer
  const candidates = await prisma.utilisateur.findMany({
    where: {
      createdAt: { lte: twentyFourHoursAgo },
      profilComplet: false,
      reminderSent: false,
      email: { not: null },
    },
    select: { id: true, email: true, pseudo: true },
    take: BATCH,
  });

  if (!candidates.length) {
    return NextResponse.json({ ok: true, sent: 0, info: "No candidates" });
  }

  // 2) Lock optimiste : on marque reminderSent=true avant envoi (évite double cron)
  const ids = candidates.map((u) => u.id);
  await prisma.utilisateur.updateMany({
    where: { id: { in: ids }, reminderSent: false },
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
          <h2 style="font-weight:700; color:#1a1a1a; margin-bottom: 0.7em;">Bonjour ${htmlEscape(pseudo)},</h2>
          <p>Vous êtes inscrit sur <b>Xpérience</b>, mais votre profil n’est pas encore complété…</p>
          <p style="margin-top:1em;">
            ✨ Pour commencer à échanger et vivre des rencontres élégantes, complétez votre profil pour être bien visible.
          </p>
          <div style="margin:2em 0;">
            <a href="${origin}/accueil-page"
              style="display:inline-block;background:#1a1a1a;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:18px;letter-spacing:1px;">
              ➡️ Compléter mon profil maintenant
            </a>
          </div>
          <p style="margin-top:1.5em;">🎁 <b>Bonus</b> : les profils complets sont mis en avant automatiquement dans les recherches !</p>
          <p style="margin-top:2.5em;">
            À très vite sur <a href="${origin}" style="color:#0070f3;text-decoration:underline;">x-periences.fr</a><br>
            <b>L’équipe Xpérience</b>
          </p>
        </div>
      `;

      await resend.emails.send({
        from: FROM,
        to: user.email,
        subject: "Il ne vous reste qu’une étape pour vivre de vraies Xpériences…",
        html,
        text: `Bonjour ${pseudo},

Vous êtes inscrit sur Xpérience, mais votre profil n’est pas encore complété.
Complétez votre profil pour être bien visible et commencer à échanger.

→ ${origin}/accueil-page

— L’équipe Xpérience`,
        headers: {
          "List-Unsubscribe": `<${origin}/parametres/notifications>`,
        },
      });

      sent++;
      actuallySent.push(user);
    } catch (e) {
      console.error("Erreur envoi email reminder:", user.email, e);
      // rollback du lock pour ce user (pour qu'il soit retenté au prochain passage)
      await prisma.utilisateur.update({
        where: { id: user.id },
        data: { reminderSent: false },
      });
    }
  }

  // 3) Récap interne si au moins 1 envoi
  if (sent > 0) {
    const lines = actuallySent.map((u) => `- ${u.pseudo || u.email} (${u.email})`).join("<br>");
    try {
      await resend.emails.send({
        from: FROM,
        to: process.env.CONTACT_EMAIL || "contact@x-periences.fr",
        subject: `Récap Cron: ${sent} relance(s) profil envoyée(s)`,
        html: `
          <div style="font-family:Arial,sans-serif">
            <h2>Cron Xpérience – Récap des relances</h2>
            <p><b>${sent}</b> mail(s) de rappel profil envoyés :</p>
            <div style="margin-top:1.5em">${lines}</div>
            <p style="margin-top:2em;font-size:13px;color:#888">--<br>Email automatique de la cron.</p>
          </div>
        `,
      });
    } catch (e) {
      console.error("Erreur envoi recap:", e);
    }
  }

  return NextResponse.json({ ok: true, sent });
}

// GET -> santé + dry-run
export async function GET(req) {
  const url = new URL(req.url);
  if (url.searchParams.get("dry") === "1") {
    const now = Date.now();
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);
    const sample = await prisma.utilisateur.findMany({
      where: {
        createdAt: { lte: twentyFourHoursAgo },
        profilComplet: false,
        reminderSent: false,
        email: { not: null },
      },
      select: { id: true, email: true, pseudo: true, createdAt: true },
      take: 20,
    });
    return NextResponse.json({ ok: true, dry: true, count: sample.length, sample });
  }
  return NextResponse.json({ ok: true, hint: "POST with ?token=CRON_SECRET or Bearer CRON_SECRET" });
}
