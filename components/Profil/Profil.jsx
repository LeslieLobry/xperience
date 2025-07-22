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

function SimpleModal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div
      className="profil-photo-modal-bg"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="profil-photo-modal-img-wrapper"
        style={{ maxWidth: "90vw", maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function calculateProfileCompletion(user) {
  const fields = [
    "pseudo", "email", "orientation", "age",
    "localisation", "description", "photoUrl",
    "taille", "silhouette", "origines"
  ];
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
  const [presignedPhotoUrl, setPresignedPhotoUrl] = useState("/default.jpg");
  const [statut, setStatut] = useState(user.statut);
  const [statutAuto, setStatutAuto] = useState(user.statutAuto);
  const [modalOpen, setModalOpen] = useState(false);

  // Pour chaque modal d’édition
  const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
  const [openProfilDetailsModal, setOpenProfilDetailsModal] = useState(false);

  // Pour uploader une photo de profil
  const [openPhotoUploader, setOpenPhotoUploader] = useState(false);
  const [uploaderKey, setUploaderKey] = useState(Date.now());

  const completion = useMemo(() => calculateProfileCompletion(user), [user]);

  // 💡 Charge la presigned URL dès que photoUrl change
  useEffect(() => {
    if (!photoUrl) {
      setPresignedPhotoUrl("/default.jpg");
      return;
    }
    if (photoUrl.startsWith("http")) {
      setPresignedPhotoUrl(photoUrl);
      return;
    }
    fetch("/api/photos/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: photoUrl }),
    })
      .then(res => res.json())
      .then(data => setPresignedPhotoUrl(data.url || "/default.jpg"))
      .catch(() => setPresignedPhotoUrl("/default.jpg"));
  }, [photoUrl]);

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

  // Champs à éditer via ProfilDetailsForm
  const profilDetailsFields = [
    "Taille", "Silhouette", "Origines", "Âge", "Fume", "Yeux", "Cheveux",
    "Taille du/de la partenaire", "Silhouette du/de la partenaire",
    "Origines du/de la partenaire", "Âge du/de la partenaire",
    "Fume du/de la partenaire", "Yeux du/de la partenaire", "Cheveux du/de la partenaire"
  ];

  function handleEditField(champ) {
    if (champ === "Description") setOpenDescriptionModal(true);
    else if (profilDetailsFields.includes(champ)) setOpenProfilDetailsModal(true);
    else if (champ === "Photo de profil") {
      setUploaderKey(Date.now()); // Force un composant neuf à chaque ouverture
      setOpenPhotoUploader(true);
    }
    // Ajoute ici d’autres modals si besoin
  }

  return (
    <div className="profil-page">
      {/* Modal d’upload photo déclenché par la complétion ou le bouton "changer photo" */}
      <SimpleModal open={openPhotoUploader} onClose={() => setOpenPhotoUploader(false)}>
        <PhotoUploader
          key={uploaderKey}
          priority
          currentUrl={photoUrl}
          isOwnProfile={isOwnProfile}
          onUpload={(url) => {
            setPhotoUrl(url);
            setOpenPhotoUploader(false);
          }}
        />
      </SimpleModal>

      <div className="profil-header-horizontal">
        <div className="profil-header-row">
          <div className="profil-avatar-horizontal">
            {/* Clique = ouvre la lightbox */}
            <div style={{ cursor: "zoom-in" }} onClick={() => setModalOpen(true)}>
              <PhotoUploader
                priority
                currentUrl={photoUrl}
                isOwnProfile={isOwnProfile}
                onUpload={(url) => {
                  setPhotoUrl(url);
                  setUploaderKey(Date.now()); // Pour éviter un bug si tu changes direct après
                }}
              />
            </div>
            {/* Affichage modal photo grand */}
            <SimpleModal open={modalOpen} onClose={() => setModalOpen(false)}>
              <img
                src={presignedPhotoUrl || "/default.jpg"}
                alt="Photo de profil"
                style={{
                  maxWidth: "90vw",
                  maxHeight: "90vh",
                  borderRadius: "12px",
                  boxShadow: "0 8px 32px 0 #0008"
                }}
              />
            </SimpleModal>
          </div>
          <div className="profil-name-like">
            <h1 className="profil-name">
              {user.pseudo.charAt(0).toUpperCase() + user.pseudo.slice(1).toLowerCase()}
            </h1>
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

      {isOwnProfile && (
        <ProfilCompletionBox
          user={user}
          completion={completion}
          onEditField={handleEditField}
        />
      )}

      <div className="grid">
        <DescriptionCard
          editable={isOwnProfile}
          description={user.description}
          isModalOpen={openDescriptionModal}
          setIsModalOpen={setOpenDescriptionModal}
        />
        <GalerieTabs publicPhotos={user.photos} galeriePrivee={user.galeriePrivee} editable={isOwnProfile} utilisateurId={user.id} visiteurId={connectedUser.id} />
        {isOwnProfile && <DemandesAccesGalerie isOwnProfile={isOwnProfile} />}
        <PreferencesSummary editable={isOwnProfile} user={user} />
        <ProfilDetailsSummary
          editable={isOwnProfile}
          user={user}
          isModalOpen={openProfilDetailsModal}
          setIsModalOpen={setOpenProfilDetailsModal}
        />
        <AvisList cibleId={user.id} connectedUserId={connectedUser.id} />
        {!isOwnProfile && <AvisForm cibleId={user.id} />}
        <AProposCard createdAt={user.createdAt} lastLogin={user.lastLogin} />
      </div>
    </div>
  );
}
