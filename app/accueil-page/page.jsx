import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { redirect } from "next/navigation";
import RechercheWrapper from "../../components/RechercheWrapper/RechercheWrapper";
import Link from "next/link";
import DerniersArticles from "../../components/DerniersArticles/DerniersArticles";
import DerniersEvenements from "../../components/DerniersEvenements/DerniersEvenements";
import RappelVerification from "../../components/RappelVerification/RappelVerification";
import { getIdsUtilisateursExclus } from "../../lib/utilsFiltrage";
import "./accueil.css";
import LoaderAnnonce from "../../components/LoaderAnnonce/LoaderAnnonce";

const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET;

export default async function AccueilPage() {
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return redirect("/connexion");

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
    if (!decoded?.id || isNaN(Number(decoded.id))) {
      console.error("❌ ID JWT manquant ou invalide :", decoded);
      return redirect("/connexion");
    }
  } catch (err) {
    console.error("❌ Erreur JWT :", err);
    return redirect("/connexion");
  }

  const userId = Number(decoded.id);

  let user;
  try {
    user = await prisma.utilisateur.findUnique({
      where: { id: userId },
      select: {
        id: true,
        verificationIdentite: true,
        verificationDeadline: true,
      },
    });
  } catch (err) {
    console.error("❌ Erreur Prisma findUnique :", err);
    return redirect("/connexion");
  }

  if (!user) return redirect("/connexion");

  // Vérification identité obligatoire
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
    exclus = await getIdsUtilisateursExclus(userId);
  } catch (err) {
    console.error("❌ Erreur récupération exclusions :", err);
  }

  const whereCommun = {
    NOT: {
      id: { in: [...exclus, userId] },
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
