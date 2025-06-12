import { prisma } from "./prisma";

/**
 * Retourne les IDs des utilisateurs à exclure :
 * - ceux que j'ai bloqués
 * - ceux qui m'ont bloqué
 */
export async function getIdsUtilisateursExclus(connectedUserId) {
  const blocagesFaits = await prisma.blocage.findMany({
    where: { bloqueurId: connectedUserId },
    select: { bloquéId: true },
  });

  const blocagesRecus = await prisma.blocage.findMany({
    where: { bloquéId: connectedUserId },
    select: { bloqueurId: true },
  });

  return [
    ...blocagesFaits.map((b) => b.bloquéId),
    ...blocagesRecus.map((b) => b.bloqueurId),
  ];
}

/**
 * Récupère tous les utilisateurs visibles par l'utilisateur connecté,
 * c’est-à-dire tous sauf ceux bloqués ou bloquants.
 */
export async function getUtilisateursVisibles(connectedUserId) {
  const exclus = await getIdsUtilisateursExclus(connectedUserId);

  return prisma.utilisateur.findMany({
    where: {
      id: {
        not: connectedUserId,
        notIn: exclus,
      },
    },
    orderBy: { pseudo: "asc" },
  });
}

/**
 * Vérifie si deux utilisateurs sont mutuellement bloqués (dans un sens ou l'autre).
 */
export async function isBlockedBetween(userAId, userBId) {
  const blocage = await prisma.blocage.findFirst({
    where: {
      OR: [
        { bloqueurId: userAId, bloquéId: userBId },
        { bloqueurId: userBId, bloquéId: userAId },
      ],
    },
  });

  return !!blocage;
}
