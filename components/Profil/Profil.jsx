"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import PhotoUploader from "../PhotoUploader/PhotoUploader";
import StatutToggle from "../StatutToggle/StatutToggle";
import DescriptionCard from "../DescriptionCard/DescriptionCard";
import PreferencesSummary from "../PreferencesSummary/PreferencesSummary";
import ProfilDetailsSummary from "../ProfilDetailsSummary/ProfilDetailsSummary";
import AProposCard from "../AProposCard/AProposCard";
import Image from "next/image";
import "../Profil/Profil.css";
import ProfilCompletionBox from "../ProfilCompletionBox/ProfilCompletionBox";

// Imports dynamiques pour alléger le bundle initial
const AvisForm = dynamic(() => import("../AvisForm/AvisForm"), { ssr: false });
const AvisList = dynamic(() => import("../AvisList/AvisList"), { ssr: false });
const MenuProfilActions = dynamic(() => import("../MenuProfilActions/MenuProfilActions"), { ssr: false });
const GalerieTabs = dynamic(() => import("../GalerieTabs/GalerieTabs"), { ssr: false });
const BoutonLike = dynamic(() => import("../BoutonLike/BoutonLike"), { ssr: false });
const DemandesAccesGalerie = dynamic(() => import("../DemandesAccesGalerie/DemandesAccesGalerie"), { ssr: false });

export default function Profil({ user, connectedUser }) {
  const router = useRouter();
  const isOwnProfile = parseInt(connectedUser.id) === parseInt(user.id);
  const [photoUrl, setPhotoUrl] = useState(user.photoUrl);
  const [canSee, setCanSee] = useState(null);
  const [statut, setStatut] = useState(user.statut);
  const [statutAuto, setStatutAuto] = useState(user.statutAuto);

  useEffect(() => {
    if (!isOwnProfile) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/utilisateur/statut");
        const data = await res.json();
        if (data?.utilisateur) {
          setStatut(data.utilisateur.statut);
          setStatutAuto(data.utilisateur.statutAuto);
        }
      } catch (err) {
        console.error("Erreur rafraîchissement statut :", err);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [isOwnProfile]);

  useEffect(() => {
    const checkAccess = async () => {
      if (isOwnProfile) return setCanSee(true);
      try {
        const res = await fetch(`/api/blocage/visibilite/${user.id}`);
        const data = await res.json();
        setCanSee(data.canSee);
      } catch {
        setCanSee(false);
      }
    };
    checkAccess();
  }, [user.id, isOwnProfile]);

  const completion = calculateProfileCompletion(user);

  const aDejaCommente = user.avisRecus?.some(
    (avis) => avis.auteur?.id === connectedUser.id
  );

function calculateProfileCompletion(user) {
  const fields = [
    "pseudo", "email", "orientation", "age",
    "localisation", "description", "photoUrl",
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


  const [demandesAcces, setDemandesAcces] = useState([]);

  useEffect(() => {
    if (!isOwnProfile) return;
    fetch(`/api/utilisateur/${user.id}/demandes-acces`)
      .then((res) => res.json())
      .then(setDemandesAcces)
      .catch((err) => console.error("Erreur chargement des demandes :", err));
  }, [isOwnProfile, user.id]);

  useEffect(() => {
    if (connectedUser && connectedUser.id !== user.id) {
      fetch("/api/visites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visiteId: parseInt(user.id) }),
      });
    }
  }, [connectedUser?.id, user.id]);

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

  if (canSee === null) return <p>Chargement du profil...</p>;
  if (canSee === false) return <p>🚫 Ce profil n’est pas accessible.</p>;

  return (
    <div className="profil-page">
      <div className="profil-header-horizontal">
        <div className="profil-avatar-horizontal">
          <PhotoUploader currentUrl={photoUrl} isOwnProfile={isOwnProfile} onUpload={setPhotoUrl} />
        </div>

        {!isOwnProfile && (
          <>
            <button className="btn-envoyer-message" onClick={handleStartConversation}>
              <div className="tooltip-container">
                <Image src="/images/enveloppe.svg" alt="Envoyer un message" width={46} height={46} />
                <span className="tooltip">Envoyer un message</span>
              </div>
            </button>

            <BoutonLike cibleId={user.id} />
            <MenuProfilActions cibleId={user.id} />
          </>
        )}
      </div>

      <h1 className="profil-name">{user.pseudo.charAt(0).toUpperCase() + user.pseudo.slice(1).toLowerCase()}</h1>

      <StatutToggle
        statut={statut}
        statutAuto={statutAuto}
        editable={isOwnProfile}
        onUpdate={({ statut, statutAuto }) => {
          if (statut) setStatut(statut);
          if (typeof statutAuto === "boolean") setStatutAuto(statutAuto);
        }}
      />

      <div className="profil-badge">{user.type} {user.orientation}</div>
      {isOwnProfile && <ProfilCompletionBox user={user} />}
      <div className="grid">
        <div className="profil-infos-wrapper">
          <div className="info-block">
            <h3>Membre 1</h3>
            <p><span className="info-label">Âge :</span> {user.age}</p>
            <p><span className="info-label">Silhouette :</span> {user.silhouette}</p>
            <p><span className="info-label">Origines :</span> {user.origines}</p>
            <p><span className="info-label">Taille :</span> {user.taille} cm</p>
            <p><span className="info-label">Localisation :</span> {user.localisation}</p>
          </div>

          {user.type === "couple" && (
            <div className="info-block">
              <h3>Membre 2</h3>
              <p><span className="info-label">Âge :</span> {user.age2 || "Non défini"}</p>
              <p><span className="info-label">Silhouette :</span> {user.silhouette2 || "Non défini"}</p>
              <p><span className="info-label">Origines :</span> {user.origines2 || "Non défini"}</p>
              <p><span className="info-label">Taille :</span> {user.taille2 ? `${user.taille2} cm` : "Non défini"}</p>
            </div>
          )}
        </div>

        <DescriptionCard editable={isOwnProfile} description={user.description} />
        <GalerieTabs publicPhotos={user.photos} galeriePrivee={user.galeriesPrivees?.[0]} editable={isOwnProfile} utilisateurId={user.id} visiteurId={connectedUser.id} />

        {isOwnProfile && (
          <DemandesAccesGalerie isOwnProfile={isOwnProfile} connectedUserId={connectedUser.id} />
        )}

        <PreferencesSummary editable={isOwnProfile} user={user} />
        <ProfilDetailsSummary editable={isOwnProfile} user={user} />
        <AvisList cibleId={user.id} connectedUserId={connectedUser.id} />

        {!isOwnProfile && !aDejaCommente && <AvisForm cibleId={user.id} />}
        {!isOwnProfile && aDejaCommente && (
          <p className="avis-deja-message">✅ Vous avez déjà laissé un avis sur ce profil.</p>
        )}

        <AProposCard createdAt={user.createdAt} lastLogin={user.lastLogin} />
      </div>
    </div>
  );
}
