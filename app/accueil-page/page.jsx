export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getUserFromToken } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { getIdsUtilisateursExclus } from "../../lib/utilsFiltrage";

import ProfilsDisplayServer from "../../components/ProfilsDisplayServer/ProfilsDisplayServer";
import DerniersArticles from "../../components/DerniersArticles/DerniersArticles";
import DerniersEvenements from "../../components/DerniersEvenements/DerniersEvenements";
import RappelVerification from "../../components/RappelVerification/RappelVerification";
import LoaderAnnonce from "../../components/LoaderAnnonce/LoaderAnnonce";
import RechercheWrapper from "../../components/RechercheWrapper/RechercheWrapper";

import { Suspense } from "react";
import "./accueil.css";

export default async function AccueilPage() {
  const user = await getUserFromToken();

  if (!user?.id || isNaN(Number(user.id))) {
    console.warn("❌ Utilisateur non connecté ou ID invalide :", user);
    return redirect("/connexion");
  }

  if (
    !user.verificationIdentite &&
    user.verificationDeadline &&
    new Date() > new Date(user.verificationDeadline)
  ) {
    return redirect("/verif-identite-obligatoire");
  }

  // Préchargement côté serveur
  const exclusPromise = getIdsUtilisateursExclus(user.id);

  const [articles, evenements] = await Promise.all([
    prisma.article.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        titre: true,
        slug: true,
        createdAt: true,
        images: {
          take: 1,
          select: { url: true },
        },
      },
    }),
 prisma.evenement.findMany({
  orderBy: [{ dateDebut: "desc" }], // <-- mets ici le vrai nom de ton champ date !
  take: 3,
  select: {
    id: true,
    titre: true,
    imageUrl: true,
    dateDebut: true, // <-- pareil ici !
    lieu: true,
  },
}),

  ]);

  return (
    <div className="accueil-page">
      {!user.verificationIdentite && user.verificationDeadline && (
        <RappelVerification deadline={user.verificationDeadline} />
      )}

      <LoaderAnnonce />

      <div className="grid-accueil">
        <RechercheWrapper />
      

        <div className="profil-list1">
          <Suspense fallback={<p>Chargement des profils...</p>}>
            <ProfilsDisplayServer userId={user.id} exclusPromise={exclusPromise} />
          </Suspense>
        </div>

        <div className="grid-articles">
          <DerniersArticles articles={articles} />
        </div>

        <div className="grid-event">
          <DerniersEvenements evenements={evenements} />
        </div>
      </div>
    </div>
  );
}
