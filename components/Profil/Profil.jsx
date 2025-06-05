"use client";

import { useRouter } from "next/navigation";
import PhotoUploader from "../PhotoUploader/PhotoUploader";
import GaleriePhotos from "../GaleriePhotos/GaleriePhotos";
import GaleriePriveePhotos from "../GaleriePriveePhotos/GaleriePriveePhotos";
import CreerGaleriePrivee from "../CreerGaleriePrivee/CreerGaleriePrivee";
import StatutToggle from "../StatutToggle/StatutToggle";
import DescriptionCard from "../DescriptionCard/DescriptionCard";
import PreferencesSummary from "../PreferencesSummary/PreferencesSummary";
import ProfilDetailsSummary from "../ProfilDetailsSummary/ProfilDetailsSummary";
import AProposCard from "../AProposCard/AProposCard";
import AvisForm from "../AvisForm/AvisForm";
import AvisList from "../AvisList/AvisList";
import MenuProfilActions from "../MenuProfilActions/MenuProfilActions";
import "../Profil/Profil.css";

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

  // 📨 Fonction pour démarrer une conversation
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
        // Redirige vers la messagerie en passant conversationId en query
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
          {isOwnProfile && <PhotoUploader currentUrl={user.photoUrl} />}
        </div>

        {!isOwnProfile && (
          <>
            {/* Bouton “Envoyer un message” */}
            <button
              className="btn-envoyer-message"
              onClick={handleStartConversation}
            >
              Envoyer un message
            </button>
            <MenuProfilActions cibleId={user.id} />
          </>
        )}
      </div>

      <h1 className="profil-name">{user.pseudo}</h1>
      {isOwnProfile && <StatutToggle initialStatut={user.statut} />}
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
            <p>
              <span className="info-label">Âge :</span>{" "}
              <span className="info-value">{user.age}</span>
            </p>
            <p>
              <span className="info-label">Silhouette :</span>{" "}
              <span className="info-value">{user.silhouette}</span>
            </p>
            <p>
              <span className="info-label">Localisation :</span>{" "}
              <span className="info-value">{user.localisation}</span>
            </p>
            <p>
              <span className="info-label">Origines :</span>{" "}
              <span className="info-value">{user.origines}</span>
            </p>
            <p>
              <span className="info-label">Taille :</span>{" "}
              <span className="info-value">{user.taille} cm</span>
            </p>
          </div>
        </div>

        <DescriptionCard editable={isOwnProfile} />
        <GaleriePhotos photos={user.photos || []} editable={isOwnProfile} />

        {/* --- GESTION GALERIE PRIVÉE --- */}
        {isOwnProfile && (
          <CreerGaleriePrivee utilisateurId={user.id} onCreated={() => window.location.reload()} />
        )}
        {user.galeriesPrivees && user.galeriesPrivees.length > 0 && (
          <GaleriePriveePhotos
            galerieId={user.galeriesPrivees[0].id}
            editable={isOwnProfile}
            utilisateurId={user.id}
          />
        )}
        {/* --- FIN GALERIE PRIVÉE --- */}

        <PreferencesSummary editable={isOwnProfile} />
        <ProfilDetailsSummary editable={isOwnProfile} />

        <AvisList cibleId={user.id} connectedUserId={connectedUser.id} />

        {user.avisLaisses?.length > 0 && (
          <div className="avis-laisses-section">
            <h2>Avis laissés</h2>
            {user.avisLaisses.map((avis) => (
              <div key={avis.id} className="avis-card">
                <div className="avis-header">
                  <strong>{user.pseudo}</strong> a laissé un avis à{" "}
                  <strong>{avis.cible?.pseudo || "un utilisateur"}</strong>
                </div>
                <p className="avis-commentaire">{avis.commentaire}</p>
              </div>
            ))}
          </div>
        )}

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
