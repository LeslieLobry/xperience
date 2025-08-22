// app/api/cron/digest/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { resend } from "../../../../lib/resend";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// -------- utils ----------
function safeEqual(a = "", b = "") {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}
function escapeHtml(s = "") {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function excerpt(s = "", n = 140) {
  const x = (s || "").trim().replace(/\s+/g, " ");
  return x.length > n ? x.slice(0, n) + "…" : x;
}

// -------- logique principale ----------
async function run(req) {
  const origin = process.env.NEXT_PUBLIC_URL || new URL(req.url).origin;

  // 1) Sélection des digests non envoyés & non lockés
  const pending = await prisma.digestNotification.findMany({
    where: { sentAt: null, processingAt: null },
    include: {
      destinataire: { select: { id: true, email: true, pseudo: true } },
      conversation: { select: { id: true } },
      message: {
        select: {
          id: true,
          contenu: true,
          type: true,
          createdAt: true,
          auteur: { select: { pseudo: true } },
        },
      },
      visite: {
        select: {
          id: true,
          visiteur: { select: { pseudo: true } },
          createdAt: true,
        },
      },
      like: {
        select: {
          id: true,
          auteur: { select: { pseudo: true } },
          createdAt: true,
        },
      },
      avis: { // ✅ ajout des avis
        select: {
          id: true,
          auteur: { select: { pseudo: true } },
          commentaire: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 2000,
  });

  if (!pending.length) {
    return { ok: true, sent: 0 };
  }

  // 2) Lock du lot
  const idsToLock = pending.map((r) => r.id);
  await prisma.digestNotification.updateMany({
    where: { id: { in: idsToLock }, processingAt: null, sentAt: null },
    data: { processingAt: new Date() },
  });

  // 3) Relecture des rows effectivement lockées
  const locked = await prisma.digestNotification.findMany({
    where: { id: { in: idsToLock }, processingAt: { not: null }, sentAt: null },
    include: {
      destinataire: { select: { id: true, email: true, pseudo: true } },
      conversation: { select: { id: true } },
      message: {
        select: {
          id: true,
          contenu: true,
          type: true,
          createdAt: true,
          auteur: { select: { pseudo: true } },
        },
      },
      visite: {
        select: {
          id: true,
          visiteur: { select: { pseudo: true } },
          createdAt: true,
        },
      },
      like: {
        select: {
          id: true,
          auteur: { select: { pseudo: true } },
          createdAt: true,
        },
      },
      avis: { // ✅ relecture avis
        select: {
          id: true,
          auteur: { select: { pseudo: true } },
          commentaire: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // 4) Groupage par user
  const byUser = new Map();
  for (const row of locked) {
    const userId = row.destinataire?.id;
    const email = row.destinataire?.email;
    if (!userId || !email) continue;
    const arr = byUser.get(userId) || [];
    arr.push(row);
    byUser.set(userId, arr);
  }

  let sentCount = 0;

  // 5) Envoi par user
  for (const [destId, items] of byUser.entries()) {
    const { destinataire } = items[0];
    const email = destinataire.email;
    const pseudo = destinataire.pseudo || "membre";

    // Groupage
    const byConv = new Map();
    const visites = [];
    const likes = [];
    const avisReçus = [];

    for (const it of items) {
      if (it.message && it.conversationId) {
        const arr = byConv.get(it.conversationId) || [];
        arr.push(it);
        byConv.set(it.conversationId, arr);
      }
      if (it.visite) visites.push(it.visite);
      if (it.like) likes.push(it.like);
      if (it.avis) avisReçus.push(it.avis);
    }

    // HTML + Text
    let sectionsHTML = "";
    let sectionsText = [];

    // Bloc visites
    for (const v of visites) {
      sectionsHTML += `
        <tr>
          <td style="padding:12px;border-bottom:1px solid rgba(255,255,255,0.1);">
            👀 <strong>${escapeHtml(v.visiteur.pseudo)}</strong> a visité votre profil.
          </td>
        </tr>
      `;
      sectionsText.push(`👀 ${v.visiteur.pseudo} a visité votre profil.`);
    }

    // Bloc likes
    for (const l of likes) {
      sectionsHTML += `
        <tr>
          <td style="padding:12px;border-bottom:1px solid rgba(255,255,255,0.1);">
            ❤️ <strong>${escapeHtml(l.auteur.pseudo)}</strong> vous a liké.
          </td>
        </tr>
      `;
      sectionsText.push(`❤️ ${l.auteur.pseudo} vous a liké.`);
    }

    // Bloc avis
    for (const a of avisReçus) {
      const preview = escapeHtml(excerpt(a.commentaire || ""));
      sectionsHTML += `
        <tr>
          <td style="padding:12px;border-bottom:1px solid rgba(255,255,255,0.1);">
            ⭐ <strong>${escapeHtml(a.auteur.pseudo)}</strong> a laissé un avis : « ${preview} »
          </td>
        </tr>
      `;
      sectionsText.push(`⭐ ${a.auteur.pseudo} a laissé un avis : "${excerpt(a.commentaire || "")}"`);
    }

    // Bloc messages
    for (const [convId, convItems] of byConv.entries()) {
      const count = convItems.length;
      const last = convItems[convItems.length - 1];
      const auteur = last?.message?.auteur?.pseudo || "Quelqu'un";

      const preview =
        last?.message?.type === "IMAGE"
          ? "(image)"
          : last?.message?.type === "AUDIO"
          ? "(audio)"
          : escapeHtml(excerpt(last?.message?.contenu || "(message)"));

      const maxLines = 3;
      const extra = Math.max(0, convItems.length - maxLines);
      const lines = convItems
        .slice(-maxLines)
        .map((ci) => {
          const who = ci?.message?.auteur?.pseudo || "Quelqu'un";
          const p =
            ci?.message?.type === "IMAGE"
              ? "(image)"
              : ci?.message?.type === "AUDIO"
              ? "(audio)"
              : escapeHtml(excerpt(ci?.message?.contenu || "(message)"));
          return `• <strong>${escapeHtml(who)}</strong> — ${p}`;
        })
        .join("<br/>");

      sectionsHTML += `
        <tr>
          <td style="padding:12px;border-bottom:1px solid rgba(255,255,255,0.1);">
            <div style="font-weight:600;margin-bottom:4px;color:#fff;">
              Conversation #${convId} — ${count} nouveau${count > 1 ? "x" : ""} message${count > 1 ? "s" : ""}
            </div>
            <div style="color:rgba(255,255,255,0.85);">
              Dernier : <strong>${escapeHtml(auteur)}</strong> — ${preview}
            </div>
            <div style="margin-top:8px;color:rgba(255,255,255,0.85);font-size:14px;line-height:1.4;">
              ${lines}${extra ? `<br/>+ ${extra} autre${extra > 1 ? "s" : ""}…` : ""}
            </div>
            <div style="margin-top:10px;">
              <a href="${origin}/messagerie?conversationId=${convId}"
                 style="display:inline-block;padding:8px 14px;background:#ff7f50;color:#fff;text-decoration:none;border-radius:4px;font-size:14px;">
                Ouvrir la conversation
              </a>
            </div>
          </td>
        </tr>
      `;

      sectionsText.push(
        `Conversation #${convId} — ${count} nouveau(x) message(s)\n` +
          `Dernier: ${auteur} — ${preview.replace(/<[^>]*>/g, "")}\n` +
          convItems
            .slice(-maxLines)
            .map((ci) => {
              const who = ci?.message?.auteur?.pseudo || "Quelqu'un";
              const p =
                ci?.message?.type === "IMAGE"
                  ? "(image)"
                  : ci?.message?.type === "AUDIO"
                  ? "(audio)"
                  : excerpt(ci?.message?.contenu || "(message)");
              return `• ${who} — ${p}`;
            })
            .join("\n") +
          (extra ? `\n+ ${extra} autre(s)…` : "") +
          `\nOuvrir: ${origin}/messagerie?conversationId=${convId}\n`
      );
    }

    const html = `
      <div style="background:#001f3f;padding:30px 0;">
        <div style="max-width:640px;margin:0 auto;background:rgba(255,255,255,0.05);border-radius:12px;overflow:hidden;">
          <div style="text-align:center;padding:20px 10px;">
            <img src="${origin}/logo.png" alt="Xpérience" style="max-width:200px;height:auto;" />
          </div>
          <div style="padding:20px;">
            <h2 style="font-weight:700;font-size:20px;margin-bottom:12px;color:#fff;">Bonjour ${escapeHtml(
              pseudo
            )},</h2>
            <p style="margin-bottom:20px;color:rgba(255,255,255,0.85);font-size:15px;">
              Voici vos dernières interactions reçues depuis votre dernière visite :
            </p>
            <table style="width:100%;border-collapse:collapse;">${sectionsHTML}</table>
            <p style="margin-top:18px;color:rgba(255,255,255,0.6);font-size:12px;">
              Vous pouvez ajuster la fréquence de ces emails dans vos paramètres.
            </p>
          </div>
        </div>
      </div>
    `;

    const text =
      `Bonjour ${pseudo},\n\n` +
      `Voici vos dernières interactions depuis votre dernière visite:\n\n` +
      sectionsText.join("\n") +
      `\n— L’équipe Xpérience\n`;

    try {
      await resend.emails.send({
        from: `"Xpérience" <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: "📬 Votre récap’ quotidien — Xpérience",
        html,
        text,
        headers: { "List-Unsubscribe": `<${origin}/parametres/notifications>` },
      });

      const ids = items.map((x) => x.id);
      await prisma.digestNotification.updateMany({
        where: { id: { in: ids } },
        data: { sentAt: new Date(), processingAt: null },
      });
      sentCount++;
    } catch (err) {
      console.error(`Digest email error (user ${destId})`, err);
      const ids = items.map((x) => x.id);
      await prisma.digestNotification.updateMany({
        where: { id: { in: ids } },
        data: { processingAt: null },
      });
    }
  }

  return { ok: true, sent: sentCount };
}

// -------- Handlers HTTP ----------
export async function POST(req) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || !safeEqual(token, process.env.CRON_SECRET || "")) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const result = await run(req);
  return NextResponse.json(result);
}

// (facultatif) GET pour debug dans le navigateur avec ?token=...
export async function GET(req) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  if (!token || !safeEqual(token, process.env.CRON_SECRET || "")) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const result = await run(req);
  return NextResponse.json(result);
}
