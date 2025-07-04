"use client";

import { useEffect, useState, useMemo } from "react";
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
import Spinner from "../Spinner/Spinner";

const AvisForm = dynamic(() => import("../AvisForm/AvisForm"), { ssr: false, loading: Spinner });
const AvisList = dynamic(() => import("../AvisList/AvisList"), { ssr: false, loading: Spinner });
const MenuProfilActions = dynamic(() => import("../MenuProfilActions/MenuProfilActions"), { ssr: false });
const GalerieTabs = dynamic(() => import("../GalerieTabs/GalerieTabs"), { ssr: false, loading: Spinner });
const BoutonLike = dynamic(() => import("../BoutonLike/BoutonLike"), { ssr: false });
const DemandesAccesGalerie = dynamic(() => import("../DemandesAccesGalerie/DemandesAccesGalerie"), { ssr: false });

function calculateProfileCompletion(user) {
  const fields = [
    "pseudo", "email", "orientation", "age",
    "localisation", "description", "photoUrl",
    "taille", "silhouette", "origines"
  ];
  // Champs pour membre 2 si couple
  if (user.type?.toLowerCase() === "couple") {
    fields.push("age2", "taille2", "silhouette2", "origines2");
  }
  let completed = 0;
  for (let field of fields) {
    if (Array.isArray(user[field])) {
      if (user[field].length > 0) completed++;
    } else if (user[field] && user[field] !== "") {
      completed++;
    }
  }
  return Math.round((completed / fields.length) * 100);
}


export default function Profil({ user, connectedUser }) {
  const router = useRouter();
  const isOwnProfile = parseInt(connectedUser.id) === parseInt(user.id);

  const [photoUrl, setPhotoUrl] = useState(user.photoUrl);
  const [statut, setStatut] = useState(user.statut);
  const [statutAuto, setStatutAuto] = useState(user.statutAuto);

  const completion = useMemo(() => calculateProfileCompletion(user), [user]);

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

  useEffect(() => {
    if (!isOwnProfile) return;
    const interval = setInterval(async () => {
      const res = await fetch("/api/utilisateur/statut");
      const data = await res.json();
      setStatut(data.utilisateur.statut);
      setStatutAuto(data.utilisateur.statutAuto);
    }, 30000);
    return () => clearInterval(interval);
  }, [isOwnProfile]);

  return (
    <div className="profil-page">
      <div className="profil-header-horizontal">
         <div className="profil-header-row">
        <div className="profil-avatar-horizontal">
          <PhotoUploader priority currentUrl={photoUrl} isOwnProfile={isOwnProfile} onUpload={setPhotoUrl} />
        </div>
        <div className="profil-name-like">
      <h1 className="profil-name">{user.pseudo.charAt(0).toUpperCase() + user.pseudo.slice(1).toLowerCase()}</h1>
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
        <div>
      <StatutToggle statut={statut} statutAuto={statutAuto} editable={isOwnProfile} />

      <div className="profil-badge">{user.type} {user.orientation}</div>
        </div>
    
      </div> 
      </div>
      {isOwnProfile && <ProfilCompletionBox user={user} completion={completion} />}

      <div className="grid">
        <DescriptionCard editable={isOwnProfile} description={user.description} />

        <GalerieTabs publicPhotos={user.photos} galeriePrivee={user.galeriePrivee} editable={isOwnProfile} utilisateurId={user.id} visiteurId={connectedUser.id} />

        {isOwnProfile && <DemandesAccesGalerie isOwnProfile={isOwnProfile} />}

        <PreferencesSummary editable={isOwnProfile} user={user} />
        <ProfilDetailsSummary editable={isOwnProfile} user={user} />

        <AvisList cibleId={user.id} connectedUserId={connectedUser.id} />

        {!isOwnProfile && <AvisForm cibleId={user.id} />}

        <AProposCard createdAt={user.createdAt} lastLogin={user.lastLogin} />
      </div>
    </div>
  );
}
