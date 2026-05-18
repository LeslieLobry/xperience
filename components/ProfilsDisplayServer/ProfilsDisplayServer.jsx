import { prisma } from "../../lib/prisma";
import ProfilsDisplay from "../ProfilsDisplay/ProfilsDisplay";
import { getIdsUtilisateursExclus } from "../../lib/utilsFiltrage";

const PAGE_SIZE = 20;

export default async function ProfilsDisplayServer({ userId, exclusPromise }) {
  const userIdInt = Number(userId);

  let exclusIds = [];

  try {
    exclusIds = exclusPromise
      ? await exclusPromise
      : await getIdsUtilisateursExclus(userIdInt);
  } catch (err) {
    console.error("❌ Erreur récupération profils exclus :", err?.message || err);
    exclusIds = [];
  }

  const idsToExclude = [
    ...new Set(
      [...exclusIds, userIdInt]
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id))
    ),
  ];

  const where =
    idsToExclude.length > 0
      ? {
          id: {
            notIn: idsToExclude,
          },
        }
      : {
          id: {
            not: userIdInt,
          },
        };

  const profils = await prisma.utilisateur.findMany({
    where,
    select: {
      id: true,
      pseudo: true,
      photoUrl: true,
      age: true,

      // ✅ nécessaire pour afficher Lille (59)
      localisation: true,
      deptCode: true,
      country: true,

      type: true,

      // ✅ important pour "en ligne" fallback
      statutAuto: true,
      lastSeenAt: true,

      // ✅ legacy
      statut: true,

      // ✅ badge vérifié
      verificationIdentiteStatut: true,
    },
    orderBy: { id: "desc" },
    take: PAGE_SIZE,
  });

  return (
    <ProfilsDisplay
      profils={profils}
      afficherPlus={true}
      pageSize={PAGE_SIZE}
    />
  );
}