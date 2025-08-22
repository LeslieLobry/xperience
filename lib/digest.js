// lib/digest.js
import { prisma } from "../lib/prisma";

/**
 * Alimente la table DigestNotification pour tous les destinataires d’un message.
 * Appeler juste après prisma.message.create(...)
 */
export async function queueDigestForMessage(messageId) {
  const msg = await prisma.message.findUnique({
    where: { id: Number(messageId) },
    select: { id: true, auteurId: true, conversationId: true, type: true },
  });
  if (!msg) return;

  // ignorer certains types si besoin
  const SKIP_TYPES = new Set(["SYSTEME", "EPHEMERE"]);
  if (SKIP_TYPES.has(msg.type)) return;

  const participants = await prisma.participant.findMany({
    where: { conversationId: msg.conversationId, supprimé: false },
    select: { utilisateurId: true },
  });

  const rows = participants
    .map(p => p.utilisateurId)
    .filter(uid => uid !== msg.auteurId)
    .map(destId => ({
      destinataireId: destId,
      conversationId: msg.conversationId,
      messageId: msg.id,
    }));

  if (!rows.length) return;

  await prisma.digestNotification.createMany({
    data: rows,
    skipDuplicates: true, // s'aligne avec @@unique(destinataireId, messageId)
  });
}
