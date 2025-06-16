import { Phone, Video, X } from "lucide-react";
import "./ChatBox.css";

export default function ChatHeader({ participants = [], onCallAudio, onCallVideo, onClose }) {
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
        <button onClick={onCallAudio} title="Appel audio"><Phone /></button>
        <button onClick={onCallVideo} title="Appel vidéo"><Video /></button>
        <button onClick={onClose} title="Fermer"><X /></button>
      </div>
    </div>
  );
}
