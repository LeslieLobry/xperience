import { prisma } from "./prisma";

/**
 * Retourne les IDs des utilisateurs que je dois exclure :
 * - ceux que j'ai bloqués
 * - ceux qui m'ont bloqué
 */
export async function getIdsUtilisateursExclus(connectedUserId) {
  const blocagesFaits = await prisma.blocage.findMany({
    where: { bloqueurId: connectedUserId },
    select: { bloqueId: true },
  });

  const blocagesRecus = await prisma.blocage.findMany({
    where: { bloqueId: connectedUserId },
    select: { bloqueurId: true },
  });

  return [
    ...blocagesFaits.map((b) => b.bloqueId),
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
