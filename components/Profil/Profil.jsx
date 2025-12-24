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
import { useOnlineStatus } from "../../context/OnlineStatusContext"; // ✅ AJOUT

const AvisForm = dynamic(() => import("../AvisForm/AvisForm"), {
  ssr: false,
  loading: Spinner,
});
const AvisList = dynamic(() => import("../AvisList/AvisList"), {
  ssr: false,
  loading: Spinner,
});
const MenuProfilActions = dynamic(
  () => import("../MenuProfilActions/MenuProfilActions"),
  { ssr: false }
);
const GalerieTabs = dynamic(() => import("../GalerieTabs/GalerieTabs"), {
  ssr: false,
  loading: Spinner,
});
const BoutonLike = dynamic(() => import("../BoutonLike/BoutonLike"), {
  ssr: false,
});
const DemandesAccesGalerie = dynamic(
  () => import("../DemandesAccesGalerie/DemandesAccesGalerie"),
  { ssr: false }
);

/* -------------------------------------------------------------------------- */
/* 🖼️ SimpleModal : offsetTop optionnel (0 = plein écran)                     */
/* -------------------------------------------------------------------------- */
function SimpleModal({ open, onClose, children, offsetTop = 0 }) {
  if (!open) return null;

  return (
    <div
      className="profil-photo-modal-bg"
      onClick={onClose}
      style={{
        position: "fixed",
        top: offsetTop, // 0 = recouvre tout l'écran
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="profil-photo-modal-img-wrapper"
        style={{
          position: "relative",
          maxWidth: "90vw",
          maxHeight: "90vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ❌ Bouton de fermeture */}
        <button
          type="button"
          className="profil-photo-modal-close"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Fermer"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            fontSize: 24,
            background: "rgba(0,0,0,0.6)",
            border: "none",
            borderRadius: "999px",
            color: "#fff",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          ✕
        </button>

        {children}
      </div>
    </div>
  );
}

function calculateProfileCompletion(user) {
  const fields = [
    "pseudo",
    "email",
    "orientation",
    "age",
    "localisation",
    "description",
    "photoUrl",
    "taille",
    "silhouette",
    "origines",
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

  // ✅ Online Presence (fiable)
  const { isOnline } = useOnlineStatus();
  const online = !isOwnProfile && isOnline?.(user?.id);

  const [photoUrl, setPhotoUrl] = useState(user.photoUrl);
  const [presignedPhotoUrl, setPresignedPhotoUrl] = useState("/default.jpg");
  const [statut, setStatut] = useState(user.statut);
  const [statutAuto, setStatutAuto] = useState(user.statutAuto);
  const [modalOpen, setModalOpen] = useState(false);

  // États modals d’édition
  const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
  const [openProfilDetailsModal, setOpenProfilDetailsModal] = useState(false);

  // Uploader photo de profil
  const [openPhotoUploader, setOpenPhotoUploader] = useState(false);
  const [uploaderKey, setUploaderKey] = useState(Date.now());

  // Anti double-clic & UX bouton message
  const [startingConv, setStartingConv] = useState(false);

  const completion = useMemo(() => calculateProfileCompletion(user), [user]);

  // Parse JSON “safe” (gère HTML/texte en cas de redirection côté API)
  async function parseJsonSafe(res) {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { __raw: text };
    }
  }

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
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: photoUrl }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("presign failed");
        const data = await res.json();
        setPresignedPhotoUrl(data.url || "/default.jpg");
      })
      .catch(() => setPresignedPhotoUrl("/default.jpg"));
  }, [photoUrl]);

  // Enregistre la visite si on consulte le profil de quelqu’un d’autre
  useEffect(() => {
    if (connectedUser && connectedUser.id !== user.id) {
      fetch("/api/visites", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visiteId: parseInt(user.id) }),
      }).catch(() => {});
    }
  }, [connectedUser?.id, user.id]);

  // 🔁 Rafraîchit le statut auto pour son propre profil (via /api/me)
  useEffect(() => {
    if (!isOwnProfile) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/me", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.success && data?.user) {
          setStatut(data.user.statut);
          setStatutAuto(data.user.statutAuto);
        }
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [isOwnProfile]);

  // 🧩 Synchronise si les props 'user' se mettent à jour
  useEffect(() => {
    setStatut(user.statut);
    setStatutAuto(user.statutAuto);
  }, [user.statut, user.statutAuto]);

  // Champs à éditer via ProfilDetailsForm
  const profilDetailsFields = [
    "Taille",
    "Silhouette",
    "Origines",
    "Âge",
    "Fume",
    "Yeux",
    "Cheveux",
    "Taille du/de la partenaire",
    "Silhouette du/de la partenaire",
    "Origines du/de la partenaire",
    "Âge du/de la partenaire",
    "Fume du/de la partenaire",
    "Yeux du/de la partenaire",
    "Cheveux du/de la partenaire",
  ];

  function handleEditField(champ) {
    if (champ === "Description") setOpenDescriptionModal(true);
    else if (profilDetailsFields.includes(champ)) setOpenProfilDetailsModal(true);
    else if (champ === "Photo de profil") {
      setUploaderKey(Date.now()); // Force un composant neuf à chaque ouverture
      setOpenPhotoUploader(true);
    }
  }

  const handleStartConversation = async () => {
    if (startingConv) return;
    setStartingConv(true);
    try {
      const meId = Number(connectedUser?.id);
      const otherId = Number(user?.id);
      if (!meId || !otherId || Number.isNaN(meId) || Number.isNaN(otherId)) {
        throw new Error("IDs invalides pour la conversation");
      }

      const res = await fetch("/api/conversations", {
        method: "POST",
        credentials: "include", // garantit l’envoi du cookie JWT
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantIds: [meId, otherId] }),
      });

      // Non-auth / redirections
      if (res.status === 401 || res.status === 403) {
        router.push(`/connexion?next=${encodeURIComponent(`/messagerie`)}`);
        return;
      }
      if (res.redirected) {
        router.push(res.url);
        return;
      }

      const data = await parseJsonSafe(res);

      const convId =
        data?.conversation?.id ??
        data?.existingConversation?.id ??
        data?.conversationId ??
        data?.id ??
        null;

      if (!res.ok || !convId) {
        const msg =
          data?.error ||
          data?.message ||
          (typeof data?.__raw === "string" ? data.__raw.slice(0, 200) : "") ||
          `HTTP ${res.status}`;
        throw new Error(`Création/lookup conversation échouée: ${msg}`);
      }

      router.push(`/messagerie?conversationId=${convId}`);
    } catch (err) {
      console.error("handleStartConversation error:", err);
      alert("Impossible de démarrer la conversation. " + (err?.message || ""));
    } finally {
      setStartingConv(false);
    }
  };

  return (
    <div className="profil-page">
      {/* Modal d’upload photo déclenché par la complétion ou le bouton "changer photo" */}
      {/* Ici on garde un léger offset pour rester sous le header si tu veux */}
      <SimpleModal
        open={openPhotoUploader}
        onClose={() => setOpenPhotoUploader(false)}
        offsetTop={80} // adapte à la hauteur de ton header ou mets 0
      >
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
            {/* Clique = ouvre la lightbox plein écran */}
            <div style={{ cursor: "zoom-in" }} onClick={() => setModalOpen(true)}>
              <PhotoUploader
                priority
                currentUrl={photoUrl}
                isOwnProfile={isOwnProfile}
                onUpload={(url) => {
                  setPhotoUrl(url);
                  setUploaderKey(Date.now());
                }}
              />
            </div>

            {/* Affichage modal photo grand => aucun offset, recouvre tout */}
            <SimpleModal open={modalOpen} onClose={() => setModalOpen(false)}>
              <img
                src={presignedPhotoUrl || "/default.jpg"}
                alt="Photo de profil"
                style={{
                  maxWidth: "90vw",
                  maxHeight: "90vh",
                  borderRadius: "12px",
                  boxShadow: "0 8px 32px 0 #0008",
                  objectFit: "contain",
                }}
              />
            </SimpleModal>
          </div>

          <div className="profil-name-like">
            <h1 className="profil-name">
              {user.pseudo.charAt(0).toUpperCase() + user.pseudo.slice(1).toLowerCase()}
              {user.verificationIdentiteStatut && (
                <img
                  src="/Profilverif.png"
                  alt="Profil vérifié"
                  className="badge-verifie-img"
                />
              )}
            </h1>

            {!isOwnProfile && (
              <>
                <button
                  className="btn-envoyer-message"
                  onClick={handleStartConversation}
                  disabled={startingConv}
                  aria-busy={startingConv ? "true" : "false"}
                  title="Envoyer un message"
                >
                  <div className="tooltip-container">
                    <Image
                      src="/images/enveloppe.svg"
                      alt="Envoyer un message"
                      width={46}
                      height={46}
                    />
                    <span className="tooltip">
                      {startingConv ? "Ouverture…" : "Envoyer un message"}
                    </span>
                  </div>
                </button>
                <BoutonLike cibleId={user.id} />
                <MenuProfilActions cibleId={user.id} />
              </>
            )}
          </div>

          <div>
            {/* ✅ ICI : statut fiable */}
            {isOwnProfile ? (
              <StatutToggle statut={statut} statutAuto={statutAuto} editable={isOwnProfile} />
            ) : (
              <div className="profil-statut-presence">
                <span
                  className={`statut-badge ${online ? "en-ligne" : "hors-ligne"}`}
                  title={online ? "En ligne" : "Hors ligne"}
                />
                <span className="profil-statut-text">
                  {online ? "En ligne" : "Hors ligne"}
                </span>
              </div>
            )}

            <div className="profil-badge">
              {user.type} {user.orientation}
            </div>
          </div>
        </div>
      </div>

      {isOwnProfile && (
        <ProfilCompletionBox user={user} completion={completion} onEditField={handleEditField} />
      )}

      <div className="grid">
        <DescriptionCard
          editable={isOwnProfile}
          description={user.description}
          isModalOpen={openDescriptionModal}
          setIsModalOpen={setOpenDescriptionModal}
        />

        <GalerieTabs
          publicPhotos={user.photos}
          galeriePrivee={user.galeriePrivee}
          editable={isOwnProfile}
          utilisateurId={user.id}
          visiteurId={connectedUser.id}
        />

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
