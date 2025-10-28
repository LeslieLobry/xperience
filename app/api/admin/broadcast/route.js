// app/api/admin/broadcast/route.js
import { getUserFromToken } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { resend } from "../../../../lib/resend"; // instance Resend déjà configurée

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ---------------- Utils batch / throttle / retry ---------------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function chunk(arr, size = 100) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Respecte Retry-After si présent, sinon backoff exponentiel + jitter */
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
        if (typeof h?.get === "function") {
          retryAfter = Number(h.get("retry-after")) || null;
        } else if (h && typeof h["retry-after"] !== "undefined") {
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

/* ---------------- Handler ---------------- */
export async function POST(req) {
  const user = await getUserFromToken();
  if (user?.role !== "ADMIN") {
    return Response.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { objet, message } = await req.json();
  if (!objet || !message) {
    return Response.json({ error: "Champ manquant" }, { status: 400 });
  }

  // Pour le from: utilise EMAIL_FROM si dispo, sinon fallback
  const RAW_FROM = process.env.EMAIL_FROM || "no-reply@x-periences.fr";
  const FROM = /<[^>]+>/.test(RAW_FROM) ? RAW_FROM : `Xpérience <${RAW_FROM}>`;

  const origin =
    process.env.NEXT_PUBLIC_URL ||
    (typeof req?.url === "string" ? new URL(req.url).origin : "https://www.x-periences.fr");

  // Récup emails (filtre basique: non vide)
  const utilisateurs = await prisma.utilisateur.findMany({
    select: { email: true },
    where: { email: { not: "" } },
  });

  if (!utilisateurs.length) {
    return Response.json({ success: true, info: "Aucun destinataire" });
  }

  // Prépare le HTML commun avec logo (on colle ton message brut + logo)
  const messageWithLogo = `
<div style="font-family: Arial, sans-serif; font-size:16px; line-height:1.6; color:#1a1a1a;">
  ${message}
  <div style="margin-top:32px;text-align:center;">
    <img src="${origin}/logo.png" alt="Logo Xpérience" style="height:42px;opacity:.92;" />
  </div>
</div>`.trim();

  // Optionnel: texte brut rapide (fallback simple)
  const textFallback = message.replace(/<[^>]+>/g, "").trim();

  // Construction des messages (1 par destinataire, mais envoyés en batch)
  const allRecipients = utilisateurs
    .map((u) => (u?.email || "").trim())
    .filter(Boolean);

  // Découpe en lots de 100 (limite batch Resend)
  const groups = chunk(allRecipients, 100);

  const THROTTLE_BETWEEN_BATCHES = 700; // ms, pour rester < 2 req/s
  let totalSent = 0;
  let totalFailed = 0;

  for (let g = 0; g < groups.length; g++) {
    const toList = groups[g];

    // Construit le payload batch
    const messages = toList.map((email) => ({
      from: FROM,
      to: [email],
      subject: objet,
      html: messageWithLogo,
      text: textFallback,
      headers: {
        "List-Unsubscribe": `<${origin}/parametres/notifications>`,
      },
      // tags: ["broadcast", "admin"], // si tu veux tagger
    }));

    try {
      const res = await sendBatchWithRetry(messages);
      const results = res?.data && Array.isArray(res.data) ? res.data : null;

      if (results) {
        // Si Resend renvoie un détail par message
        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          if (r?.id && !r?.error) totalSent++;
          else totalFailed++;
        }
      } else {
        // Pas de détail → on considère le lot OK
        totalSent += messages.length;
      }
    } catch (e) {
      // Échec complet du lot: tout en failed
      totalFailed += messages.length;
      console.error("[admin/broadcast] batch failed:", e);
    }

    // Throttle entre lots (sauf après le dernier)
    if (g < groups.length - 1) {
      await sleep(THROTTLE_BETWEEN_BATCHES);
    }
  }

  return Response.json({
    success: true,
    totalRecipients: allRecipients.length,
    batches: groups.length,
    sent: totalSent,
    failed: totalFailed,
  });
}
