import { useEffect, useState } from "react";
import Link from "next/link";
import { Phone, Video, X, Plus, ArrowLeft } from "lucide-react";
import "./ChatBox.css";

// --- Ajoute ce hook ici ---
function usePresignedPhotos(participants) {
  const [photoUrls, setPhotoUrls] = useState({});
  useEffect(() => {
    let canceled = false;
    async function fetchAll() {
      const result = {};
      await Promise.all(
        participants.map(async (p) => {
          if (!p.photoUrl) { result[p.id] = "/default.jpg"; return; }
          if (p.photoUrl.startsWith("http")) { result[p.id] = p.photoUrl; return; }
          try {
            const res = await fetch("/api/photos/presign", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key: p.photoUrl }),
            });
            const data = await res.json();
            result[p.id] = data.url || "/default.jpg";
          } catch { result[p.id] = "/default.jpg"; }
        })
      );
      if (!canceled) setPhotoUrls(result);
    }
    fetchAll();
    return () => { canceled = true; };
  }, [JSON.stringify(participants)]);
  return photoUrls;
}

export default function ChatHeader({
  participants = [],
  onCallAudio,
  onCallVideo,
  onClose,
  inCall,
  onAddParticipant,
  onBack,
}) {
  const photoUrls = usePresignedPhotos(participants);
  // Simple détection mobile JS (optionnel)
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  return (
    <div className="chat-header">
      <div className="chat-participants">
        {onBack && (
          <button
            onClick={onBack}
            className="chat-back-btn"
            aria-label="Retour"
            style={{
              marginRight: 10,
              fontSize: 24,
              color: "#ad935e",
              background: "none",
              border: "none",
              cursor: "pointer"
            }}
          >
            <ArrowLeft />
          </button>
        )}

        {participants.length === 0 ? (
          <p className="aucun-participant">Aucun participant trouvé</p>
        ) : (
          participants.map((p) => (
            <Link
              key={p.id}
              href={`/profil/${p.id}`}
              className="participant-info"
              passHref
            >
              <img
                src={photoUrls[p.id] || "/default.jpg"}
                alt={p.pseudo}
                className="participant-avatar"
                onError={e => { e.target.onerror = null; e.target.src = "/default.jpg"; }}
              />
              <span className="participant-name">{p.pseudo}</span>
            </Link>
          ))
        )}
      </div>

      <div className="chat-actions">
        {!inCall && onAddParticipant && (
          <button onClick={onAddParticipant} title="Ajouter un membre">
            <Plus />
          </button>
        )}
        {!inCall && (
          <>
            <button onClick={() => onCallAudio()} title="Appel audio">
              <Phone />
            </button>
            <button onClick={() => onCallVideo()} title="Appel vidéo">
              <Video />
            </button>
          </>
        )}
        {inCall && (
          <button onClick={onClose} title="Raccrocher">
            <X />
          </button>
        )}
      </div>
    </div>
  );
}
