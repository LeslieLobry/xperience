// lib/send-bulk-with-resend.js
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/** Petit utilitaire pour chunker un tableau en sous-tableaux de taille size */
function chunk(arr, size = 100) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Attente async */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Envoi d'un lot via batch.send avec retries sur 429 */
async function sendBatchWithRetry(messages, { maxRetries = 5 } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await resend.batch.send(messages);
    } catch (err) {
      // Resend renvoie name = "rate_limit_exceeded" pour le 429
      if (err?.name === "rate_limit_exceeded" || err?.statusCode === 429) {
        const retryAfter =
          Number(err?.response?.headers?.get?.("retry-after")) || null;
        const backoff = retryAfter
          ? retryAfter * 1000
          : Math.min(2000, 300 * 2 ** attempt) + Math.floor(Math.random() * 200); // backoff + jitter
        if (attempt >= maxRetries) throw err;
        attempt++;
        await sleep(backoff);
        continue;
      }
      throw err;
    }
  }
}

/**
 * Envoi en masse (liste d'objets {email, pseudo, ...})
 * - en lots de 100 (limite Resend Batch)
 * - 1 lot à la fois (pour rester << 2 req/s)
 * - pause 700 ms entre lots pour ne jamais frôler la limite
 */
export async function sendBulkEmail({
  recipients,         // [{email, pseudo}, ...]
  from,               // "Xperiences <noreply@x-periences.fr>"
  subject,
  html,               // contenu HTML
  text,               // optionnel
  tags = [],          // optionnel (ex: ["newsletter", "oct-2025"])
}) {
  const groups = chunk(recipients, 100);
  const results = [];

  for (let g = 0; g < groups.length; g++) {
    const batch = groups[g].map((u) => ({
      from,
      to: [u.email],
      subject,
      html: typeof html === "function" ? html(u) : html,
      text: typeof text === "function" ? text(u) : text,
      tags, // Resend supporte désormais des tags aussi pour les batch/scheduled
    }));

    const res = await sendBatchWithRetry(batch);
    results.push(res);

    // throttle doux entre lots (2 req/s max côté Resend)
    if (g < groups.length - 1) {
      await sleep(700);
    }
  }

  return results;
}
