export const dynamic = "force-dynamic"; // 🔁 important sur Vercel pour désactiver le cache SSR

import { PrismaClient } from "../../lib/client";
import { redirect } from "next/navigation";
import { getUserFromToken } from "../../lib/auth";
import RechercheWrapper from "../../components/RechercheWrapper/RechercheWrapper";
import Link from "next/link";
import DerniersArticles from "../../components/DerniersArticles/DerniersArticles";
import DerniersEvenements from "../../components/DerniersEvenements/DerniersEvenements";
import RappelVerification from "../../components/RappelVerification/RappelVerification";
import { getIdsUtilisateursExclus } from "../../lib/utilsFiltrage";
import "./accueil.css";
import LoaderAnnonce from "../../components/LoaderAnnonce/LoaderAnnonce";

const prisma = new PrismaClient();

export default async function AccueilPage() {
  const user = await getUserFromToken();
  if (!user) return redirect("/connexion");

  // Redirection si identité non vérifiée et délai dépassé
  if (
    !user.verificationIdentite &&
    user.verificationDeadline &&
    new Date() > new Date(user.verificationDeadline)
  ) {
    return redirect("/verif-identite-obligatoire");
  }

  // Utilisateurs à exclure
  let exclus = [];
  try {
    exclus = await getIdsUtilisateursExclus(user.id);
  } catch (err) {
    console.error("❌ Erreur récupération exclusions :", err);
  }

  const whereCommun = {
    NOT: {
      id: { in: [...exclus, user.id] },
    },
  };

  const [profilsEnLigne, tousLesProfils] = await Promise.all([
    prisma.utilisateur.findMany({
      where: { ...whereCommun, statut: "en_ligne" },
      select: { id: true, pseudo: true, photoUrl: true, age: true, localisation: true },
      take: 15,
    }),
    prisma.utilisateur.findMany({
      where: whereCommun,
      select: { id: true, pseudo: true, photoUrl: true, age: true, localisation: true },
      take: 15,
    }),
  ]);

  const renderProfilCard = (user) => (
    <Link href={`/profil/${user.id}`} key={user.id} className="profil-card-link">
      <div className="profil-card">
        <img
          src={
            user.photoUrl
              ? user.photoUrl.startsWith("http")
                ? user.photoUrl
                : `/uploads/${user.photoUrl.replace(/^\/?uploads\//, "")}`
              : "/default.jpg"
          }
          alt={user.pseudo}
          className="profil-photo"
        />
        <h2 className="profil-card-title">{user.pseudo}</h2>
        <p className="profil-card-details">{user.age} ans - {user.localisation}</p>
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
        <div className="profil-list1">
          <h1 className="profil-list1-title">Profils en ligne</h1>
          {profilsEnLigne.map(renderProfilCard)}
          <Link href="/profils-en-ligne" className="afficher-plus">Afficher plus</Link>
        </div>

        <div className="profil-list2">
          <h1 className="profil-list1-title">Tous les profils</h1>
          {tousLesProfils.map(renderProfilCard)}
          <Link href="/profils" className="afficher-plus">Afficher plus</Link>
        </div>

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
