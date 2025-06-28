// components/ProfilsDisplayServer.jsx
import { prisma } from "../../lib/prisma";
import ProfilsDisplay from "../ProfilsDisplay/ProfilsDiplay";
import { getIdsUtilisateursExclus } from "../../lib/utilsFiltrage";
import { type } from "os";

export default async function ProfilsDisplayServer({ userId }) {
  let profils = [];

  try {
    const exclus = await getIdsUtilisateursExclus(userId);

    profils = await prisma.utilisateur.findMany({
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
        type:true,
      },
      take: 30,
    });
  } catch (err) {
    console.error("❌ Erreur chargement profils :", err);
  }

  return <ProfilsDisplay profils={profils} />;
}
