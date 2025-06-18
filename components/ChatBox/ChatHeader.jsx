import { Phone, Video, X } from "lucide-react";
import "./ChatBox.css";

export default function ChatHeader({ participants = [], onCallAudio, onCallVideo, onClose, inCall }) {
  return (
    <div className="chat-header">
      <div className="chat-participants">
        {participants.map((p) => (
          <div key={p.id} className="participant-info">
            <img
              src={p.photoUrl || "/default-avatar.png"}
              alt={p.pseudo}
              className="participant-avatar"
            />
            <span className="participant-name">{p.pseudo}</span>
          </div>
        ))}
      </div>

      <div className="chat-actions">
        {/* Affiche les boutons appel seulement si on n'est pas en appel */}
        {!inCall && (
          <>
            <button onClick={onCallAudio} title="Appel audio"><Phone /></button>
            <button onClick={onCallVideo} title="Appel vidéo"><Video /></button>
          </>
        )}

        {/* Affiche bouton fermer (raccrocher) uniquement si on est en appel */}
        {inCall && (
          <button onClick={onClose} title="Raccrocher"><X /></button>
        )}
      </div>
    </div>
  );
}
