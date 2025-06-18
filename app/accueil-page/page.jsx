export const dynamic = "force-dynamic"; // 🔁 important sur Vercel

import { prisma } from "../../lib/prisma";
import { redirect } from "next/navigation";
import { getUserFromToken } from "../../lib/auth";
import RechercheWrapper from "../../components/RechercheWrapper/RechercheWrapper";
import Link from "next/link";
import DerniersArticles from "../../components/DerniersArticles/DerniersArticles";
import DerniersEvenements from "../../components/DerniersEvenements/DerniersEvenements";
import RappelVerification from "../../components/RappelVerification/RappelVerification";
import { getIdsUtilisateursExclus } from "../../lib/utilsFiltrage";
import LoaderAnnonce from "../../components/LoaderAnnonce/LoaderAnnonce";
import ProfilsDisplay from "../../components/ProfilsDisplay/ProfilsDiplay";
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

  let exclus = [];
  try {
    exclus = await getIdsUtilisateursExclus(user.id);
  } catch (err) {
    console.error("Erreur récupération des profils :", err.message, err.stack);
  }

  const whereCommun = {
    NOT: {
      id: { in: [...exclus, user.id] },
    },
  };

  let tousLesProfils = [];
  try {
    tousLesProfils = await prisma.utilisateur.findMany({
      where: whereCommun,
      select: {
        id: true,
        pseudo: true,
        photoUrl: true,
        age: true,
        localisation: true,
        statut: true,
      },
      take: 30,
    });
  } catch (err) {
    console.error("❌ Erreur récupération des profils :", err);
  }

  const renderProfilCard = (user) => (
    <Link href={`/profil/${user.id}`} key={user.id} className="profil-card-link">
      <div className="profil-card">
        <img
          src={
            user.photoUrl?.startsWith("http")
              ? user.photoUrl
              : user.photoUrl
              ? `/uploads/${user.photoUrl.replace(/^\/?uploads\//, "")}`
              : "/default.jpg"
          }
          alt={user.pseudo}
          className="profil-photo"
        />
        <h2 className="profil-card-title">{user.pseudo}</h2>
        <p className="profil-card-details">
          {user.age} ans - {user.localisation}
        </p>
      </div>
    </Link>
  );

  return (
    <div className="accueil-page">
      {!user.verificationIdentite && user.verificationDeadline && (
        <RappelVerification deadline={user.verificationDeadline} />
      )}
      <LoaderAnnonce />
      <div className="grid-accueil">
        <ProfilsDisplay profils={tousLesProfils} />
        <div className="grid-articles">
          <DerniersArticles />
        </div>
        <RechercheWrapper />
        <div className="grid-event">
          <DerniersEvenements />
        </div>
      </div>
    </div>
  );
}
