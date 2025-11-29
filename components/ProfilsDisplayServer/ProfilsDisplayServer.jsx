import { prisma } from "../../lib/prisma";
import ProfilsDisplay from "../ProfilsDisplay/ProfilsDisplay";
import { getIdsUtilisateursExclus } from "../../lib/utilsFiltrage";

const PAGE_SIZE = 20;

export default async function ProfilsDisplayServer({ userId, exclusPromise }) {
  const userIdInt = Number(userId);

  let exclusIds = [];
  try {
    // On essaye d'utiliser la promesse passée pour paralléliser au niveau au-dessus
    exclusIds = exclusPromise
      ? await exclusPromise
      : await getIdsUtilisateursExclus(userIdInt);
  } catch (err) {
    console.error("❌ Erreur récupération profils exclus :", err?.message || err);
    exclusIds = [];
  }

  // Normalisation des IDs en nombres + nettoyage
  const idsToExclude = [
    ...new Set(
      [...exclusIds, userIdInt]
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id))
    ),
  ];

  // Construction du where le plus simple possible pour la DB
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
      localisation: true,
      statut: true,
      type: true,
    },
    // 🔁 Idem que ta route /api/profils (id desc) pour éviter les doublons
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
