import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import ProfilDetailsSummary from "../../components/ProfilDetailsSummary/ProfilDetailsSummary";
import PreferencesSummary from "../../components/PreferencesSummary/PreferencesSummary";
import DescriptionCard from "../../components/DescriptionCard/DescriptionCard";
import AProposCard from "../../components/AProposCard/AProposCard";
import PhotoUploader from "../../components/PhotoUploader/PhotoUploader";
import GaleriePhotos from "../../components/GaleriePhotos/GaleriePhotos";
import StatutToggle from "../../components/StatutToggle/StatutToggle";
import AvisForm from "../../components/AvisForm/AvisForm";
import AvisList from "../../components/AvisList/AvisList";

import "../utilisateurs/utilisateurs.css";

const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET;

export default async function ProfilPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return redirect("/connexion");

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch (e) {
    return redirect("/connexion");
  }

  const connectedUser = await prisma.utilisateur.findUnique({
    where: { id: decoded.id },
  });

  const user = await prisma.utilisateur.findUnique({
    where: { id: decoded.id }, // ⛳️ ou un autre id si profil public
    include: {
      recherches: true,
      photos: true,
      avisRecus: {
        include: {
          auteur: {
            select: {
              id: true, // requis pour pouvoir modifier/supprimer
              pseudo: true,
              photoUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!user) return redirect("/connexion");

  function calculateProfileCompletion(user) {
    const fields = [
      'pseudo', 'email', 'sexe', 'orientation', 'age',
      'localisation', 'description', 'photoUrl', 'coverUrl',
      'taille', 'silhouette', 'origines'
    ];

    let completed = 0;
    for (let field of fields) {
      if (Array.isArray(user[field])) {
        if (user[field].length > 0) completed++;
      } else if (user[field] && user[field] !== '') {
        completed++;
      }
    }

    return Math.round((completed / fields.length) * 100);
  }

  const completion = calculateProfileCompletion(user);

  return (
    <div className="profil-page">
      <div className="profil-header-horizontal">
        <div className="profil-avatar-horizontal">
          <PhotoUploader currentUrl={user.photoUrl} />
        </div>
      </div>

      <h1 className="profil-name">{user.pseudo}</h1>
      <StatutToggle initialStatut={user.statut} />
      <div className="profil-badge">{user.type} {user.orientation}</div>

      <div className="profil-completion-box">
        <h2>Devenez irrésistible, complétez votre profil !</h2>
        <p>
          Vous valoriserez ainsi davantage vos recherches tout en vous présentant
          sous votre meilleur jour.
        </p>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${completion}%` }}
          ></div>
        </div>
        <p className="completion-text">{completion}% complété</p>
      </div>

      <div className="grid">
        <div className="profil-infos-wrapper">
          <div className="info-block">
            <p><span className="info-label">Âge :</span> <span className="info-value">{user.age}</span></p>
            <p><span className="info-label">Silhouette :</span> <span className="info-value">{user.silhouette}</span></p>
            <p><span className="info-label">Localisation :</span> <span className="info-value">{user.localisation}</span></p>
            <p><span className="info-label">Origines :</span> <span className="info-value">{user.origines}</span></p>
            <p><span className="info-label">Taille :</span> <span className="info-value">{user.taille} cm</span></p>
          </div>
        </div>

        <DescriptionCard />
        <GaleriePhotos photos={user.photos || []} />
        <PreferencesSummary />
        <ProfilDetailsSummary />

        {/* ✅ Affichage des avis avec actions si l'utilisateur est l'auteur */}
        <AvisList avisRecus={user.avisRecus} connectedUserId={connectedUser.id} />

        {/* ✅ Affiche le formulaire seulement si ce n’est pas son propre profil */}
        {connectedUser.id !== user.id && (
          <AvisForm cibleId={user.id} />
        )}
        <AProposCard createdAt={user.createdAt} lastLogin={user.lastLogin} />
      </div>
    </div>
  );
}
