import Link from "next/link";
import { Phone, Video, X, Plus, ArrowLeft } from "lucide-react";
import "./ChatBox.css";

export default function ChatHeader({
  participants = [],
  onCallAudio,
  onCallVideo,
  onClose,
  inCall,
  onAddParticipant,
  onBack,
}) {
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
                src={p.photoUrl || "/default-avatar.png"}
                alt={p.pseudo}
                className="participant-avatar"
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
