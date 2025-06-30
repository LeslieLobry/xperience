import Link from "next/link";
import { Phone, Video, X } from "lucide-react";
import "./ChatBox.css";

export default function ChatHeader({ participants = [], onCallAudio, onCallVideo, onClose, inCall }) {
  return (
    <div className="chat-header">
      <div className="chat-participants">
        {participants.length === 0 ? (
          <p className="aucun-participant">Aucun participant trouvé</p>
        ) : (
          participants.map((p) => (
            <Link key={p.id} href={`/profil/${p.id}`} className="participant-info">
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
        {!inCall && (
          <>
           <button onClick={() => onCallAudio()} title="Appel audio"><Phone /></button>
           <button onClick={() => onCallVideo()} title="Appel vidéo"><Video /></button>
          </>
        )}
        {inCall && (
          <button onClick={onClose} title="Raccrocher"><X /></button>
        )}
      </div>
     
    </div>
  );
}
