"use client";

import PhotoUploader from "../PhotoUploader/PhotoUploader";
import GaleriePhotos from "../GaleriePhotos/GaleriePhotos";
import StatutToggle from "../StatutToggle/StatutToggle";
import DescriptionCard from "../DescriptionCard/DescriptionCard";
import PreferencesSummary from "../PreferencesSummary/PreferencesSummary";
import ProfilDetailsSummary from "../ProfilDetailsSummary/ProfilDetailsSummary";
import AProposCard from "../AProposCard/AProposCard";
import AvisForm from "../AvisForm/AvisForm";
import AvisList from "../AvisList/AvisList";

export default function Profil({ user, connectedUser }) {
  const completion = calculateProfileCompletion(user);

  const aDejaCommente = user.avisRecus.some(
    (avis) => avis.auteur.id === connectedUser.id
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

        <AvisList initialAvisRecus={user.avisRecus} connectedUserId={connectedUser.id} />

        {parseInt(connectedUser.id) !== parseInt(user.id) && !aDejaCommente && (
          <AvisForm cibleId={user.id} />
        )}

        {parseInt(connectedUser.id) !== parseInt(user.id) && aDejaCommente && (
          <p className="avis-deja-message">✅ Vous avez déjà laissé un avis sur ce profil.</p>
        )}

        <AProposCard createdAt={user.createdAt} lastLogin={user.lastLogin} />
      </div>
    </div>
  );
}
