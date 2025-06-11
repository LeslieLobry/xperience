"use client";

import { useRouter } from "next/navigation";
import PhotoUploader from "../PhotoUploader/PhotoUploader";
import GaleriePriveePhotos from "../GaleriePriveePhotos/GaleriePriveePhotos";
import StatutToggle from "../StatutToggle/StatutToggle";
import DescriptionCard from "../DescriptionCard/DescriptionCard";
import PreferencesSummary from "../PreferencesSummary/PreferencesSummary";
import ProfilDetailsSummary from "../ProfilDetailsSummary/ProfilDetailsSummary";
import AProposCard from "../AProposCard/AProposCard";
import AvisForm from "../AvisForm/AvisForm";
import AvisList from "../AvisList/AvisList";
import MenuProfilActions from "../MenuProfilActions/MenuProfilActions";
import GalerieTabs from "../GalerieTabs/GalerieTabs";
import "../Profil/Profil.css";
import BoutonLike from "../BoutonLike/BoutonLike";
import Image from "next/image";


export default function Profil({ user, connectedUser }) {
  const router = useRouter();
  const isOwnProfile = parseInt(connectedUser.id) === parseInt(user.id);

  const completion = calculateProfileCompletion(user);

  const aDejaCommente = user.avisRecus?.some(
    (avis) => avis.auteur?.id === connectedUser.id
  );

  function calculateProfileCompletion(user) {
    const fields = [
      "pseudo", "email", "sexe", "orientation", "age",
      "localisation", "description", "photoUrl", "coverUrl",
      "taille", "silhouette", "origines"
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

  const handleStartConversation = async () => {
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantIds: [parseInt(connectedUser.id), parseInt(user.id)],
        }),
      });

      const data = await response.json();
      if (data.conversation?.id) {
        router.push(`/messagerie?conversationId=${data.conversation.id}`);
      } else {
        console.error("Impossible de démarrer la conversation", data);
      }
    } catch (err) {
      console.error("Erreur lors de la création de conversation :", err);
    }
  };

  return (
    <div className="profil-page">
      <div className="profil-header-horizontal">
       <div className="profil-avatar-horizontal">
         <PhotoUploader currentUrl={user.photoUrl} isOwnProfile={isOwnProfile} />
      </div>

        {!isOwnProfile && (
          <>
            <button
              className="btn-envoyer-message"
              onClick={handleStartConversation}
            >
              <Image
                src="/images/enveloppe.svg"
                alt="Envoyer un message"
                width={46}
                height={46}
              />
            </button>
          {!isOwnProfile && <BoutonLike cibleId={user.id} />}
            <MenuProfilActions cibleId={user.id} />
          </>
        )}
      </div>
      <h1 className="profil-name">{user.pseudo}</h1>
      {isOwnProfile && <StatutToggle initialStatut={user.statut} />}
      <div className="profil-badge">{user.type} {user.orientation}</div>

      {isOwnProfile && (
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
)}


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

        <DescriptionCard editable={isOwnProfile} />

        <GalerieTabs
          publicPhotos={user.photos}
          galeriePrivee={user.galeriesPrivees?.[0]}
          editable={isOwnProfile}
          utilisateurId={user.id}
        />

        <PreferencesSummary editable={isOwnProfile} />
        <ProfilDetailsSummary editable={isOwnProfile} />

        <AvisList cibleId={user.id} connectedUserId={connectedUser.id} />

        {!isOwnProfile && !aDejaCommente && (
          <AvisForm cibleId={user.id} />
        )}

        {!isOwnProfile && aDejaCommente && (
          <p className="avis-deja-message">
            ✅ Vous avez déjà laissé un avis sur ce profil.
          </p>
        )}

        <AProposCard
          createdAt={user.createdAt}
          lastLogin={user.lastLogin}
        />
      </div>
    </div>
  );
}
