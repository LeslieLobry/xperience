export const dynamic = "force-dynamic"; // 🔁 important sur Vercel

import { redirect } from "next/navigation";
import { getUserFromToken } from "../../lib/auth";
import { getIdsUtilisateursExclus } from "../../lib/utilsFiltrage";

import ProfilsDisplayServer from "../../components/ProfilsDisplayServer/ProfilsDisplayServer";
import DerniersArticlesServer from "../../components/DerniersArticlesServer/DerniersArticlesServer";
import DerniersEvenementsServer from "../../components/DerniersEvenementsServer/DerniersEvenementsServer";

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

  // Précalcule les exclus uniquement pour ProfilsDisplayServer
  let exclus = [];
  try {
    exclus = await getIdsUtilisateursExclus(user.id);
  } catch (err) {
    console.error("Erreur récupération des profils exclus :", err.message);
  }

  return (
    <div className="accueil-page">
      {!user.verificationIdentite && user.verificationDeadline && (
        <RappelVerification deadline={user.verificationDeadline} />
      )}

      <LoaderAnnonce />

      <div className="grid-accueil">
        {/* Colonne 1 */}
        <div className="recherche-sidebar">
          <RechercheWrapper />
        </div>

        {/* Colonne 2 */}
        <div className="profil-list1">
          <Suspense fallback={<p>Chargement des profils...</p>}>
            <ProfilsDisplayServer userId={user.id} exclus={exclus} />
          </Suspense>
        </div>

        {/* Colonne 3 */}
        <div className="grid-articles">
          <Suspense fallback={<p>Chargement des articles...</p>}>
            <DerniersArticlesServer />
          </Suspense>
        </div>

        {/* Colonne 3, ligne 2 */}
        <div className="grid-event">
          <Suspense fallback={<p>Chargement des événements...</p>}>
            <DerniersEvenementsServer />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
