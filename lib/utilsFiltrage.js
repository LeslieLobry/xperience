import { prisma } from "./prisma";

export async function getIdsUtilisateursExclus(connectedUserId) {
  const blocages = await prisma.blocage.findMany({
    where: {
      OR: [
        { bloqueurId: connectedUserId },
        { bloquéId: connectedUserId },
      ],
    },
    select: {
      bloqueurId: true,
      bloquéId: true,
    },
  });

  const exclus = new Set();

  for (const blocage of blocages) {
    if (blocage.bloquéId !== connectedUserId) exclus.add(blocage.bloquéId);
    if (blocage.bloqueurId !== connectedUserId) exclus.add(blocage.bloqueurId);
  }

  return [...exclus];
}

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
