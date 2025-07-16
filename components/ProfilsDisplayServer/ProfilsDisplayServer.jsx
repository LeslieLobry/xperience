import { prisma } from "../../lib/prisma";
import ProfilsDisplay from "../ProfilsDisplay/ProfilsDisplay";
import { getIdsUtilisateursExclus } from "../../lib/utilsFiltrage";

export default async function ProfilsDisplayServer({ userId, exclusPromise }) {
  let exclus = [];
  try {
    exclus = exclusPromise ? await exclusPromise : await getIdsUtilisateursExclus(userId);
  } catch (err) {
    console.error("❌ Erreur récupération profils exclus :", err.message);
  }

  const profils = await prisma.utilisateur.findMany({
    where: {
      NOT: {
        id: { in: [...exclus, userId] },
      },
    },
    select: {
      id: true,
      pseudo: true,
      photoUrl: true,
      age: true,
      localisation: true,
      statut: true,
      type: true,
    },
    orderBy: { createdAt: "desc" },
    take:25
  });
return <ProfilsDisplay profils={profils} afficherPlus={true} />;

}
