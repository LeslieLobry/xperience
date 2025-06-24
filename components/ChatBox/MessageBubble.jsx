import { useState, useEffect, useRef } from "react";
import MessageAudio from "../MessageAudio/MessageAudio";

export default function MessageBubble({
  msg,
  utilisateur,
  previousMsg,
  lastReads,
  onReact,
  onDelete,
  emojiPack = "sexy",
}) {
  const emojiPacks = {
    sexy: ["😍", "😈", "💋", "👀", "💦", "🍑"],
    glamour: ["🖤", "🥂", "🥀", "🪩", "🎭", "🫣"],
    erotique: ["🫦", "🍆", "🍒", "🥵", "🛏️", "🧴"],
    sensuel: ["🫶", "🪶", "🎀", "🤤", "😮‍💨", "👄"],
  };

  const emojiTooltips = {
    "😍": "Je te veux",
    "😈": "Coquin",
    "💋": "Un bisou",
    "👀": "Je te mate",
    "💦": "Excité(e)",
    "🍑": "Belle paire",
    "🖤": "Mystérieux",
    "🥂": "Tentant",
    "🥀": "Désir fané",
    "🪩": "Ambiance chaude",
    "🎭": "Jeu de rôle",
    "🫣": "Gêné mais tenté",
    "🫦": "Lèvres pulpeuses",
    "🍆": "Bandant",
    "🍒": "Tentante",
    "🥵": "C’est chaud",
    "🛏️": "Viens dans mon lit",
    "🧴": "Massage sexy",
    "🫶": "Connexion",
    "🪶": "Sensuel",
    "🎀": "À déballer",
    "🤤": "J’en salive",
    "😮‍💨": "Soupir de plaisir",
    "👄": "Envie de t’embrasser",
  };

  const [selectedPack, setSelectedPack] = useState(emojiPack);
  const [showPicker, setShowPicker] = useState(false);

  const pickerRef = useRef(null);
  const buttonRef = useRef(null);

  // Gestion fermeture picker au clic en dehors
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setShowPicker(false);
      }
    }
    if (showPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPicker]);

  const isOwn = msg.auteurId === utilisateur.id;
  const showAuthorInfo =
    !isOwn && (!previousMsg || previousMsg.auteurId !== msg.auteurId);

  const heure = msg.createdAt
    ? new Date(msg.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  let statutTexte = "";
  if (isOwn && lastReads) {
    const autresLecteurs = lastReads.filter(
      (r) => r.utilisateurId !== utilisateur.id
    );
    const lus = autresLecteurs.filter(
      (r) => r.lastReadAt && new Date(r.lastReadAt) > new Date(msg.createdAt)
    );
    if (lus.length === autresLecteurs.length && lus.length > 0) {
      statutTexte = "✔✔ Vu";
    } else if (lus.length > 0) {
      statutTexte = "✔✔ Reçu";
    } else {
      statutTexte = "✔ Envoyé";
    }
  }

  const groupedReactions = Object.entries(
    msg.reactions?.reduce((acc, r) => {
      const pseudo = r.utilisateur?.pseudo || "Quelqu’un";
      if (!acc[r.emoji]) acc[r.emoji] = new Set();
      acc[r.emoji].add(pseudo);
      return acc;
    }, {}) || {}
  );

  return (
    <div className={`message-bubble ${isOwn ? "own" : "other"}`}>
      {showAuthorInfo && (
        <div className="author-info">
          <img
            src={msg.auteur?.photoUrl || "/default-avatar.png"}
            alt={msg.auteur?.pseudo}
            className="author-avatar"
          />
          <span className="author-name">{msg.auteur?.pseudo}</span>
        </div>
      )}

      {msg.type === "IMAGE" && msg.imageUrl ? (
        <img src={msg.imageUrl} alt="image envoyée" className="message-image" />
      ) : msg.type === "AUDIO" && msg.audioUrl ? (
        <MessageAudio url={msg.audioUrl} duration={msg.duree || "0:00"} />
      ) : (
        <p className="message-text">{msg.contenu}</p>
      )}

      <div className="message-meta">
        <span className="message-time">{heure}</span>
        {isOwn && <span className="message-status">{statutTexte}</span>}
      </div>
      {isOwn && (
  <button
    className="delete-message-button"
    onClick={() => onDelete?.(msg.id)}
    title="Supprimer ce message"
  >
    🗑️
  </button>
)}


      {groupedReactions.length > 0 && (
        <div className="message-reactions">
          {groupedReactions.map(([emoji, pseudoSet]) => {
            const pseudos = Array.from(pseudoSet);
            return (
              <span
                key={emoji}
                className={`reaction-item ${
                  msg.reactions?.some(
                    (r) =>
                      r.emoji === emoji &&
                      r.utilisateurId === utilisateur.id
                  )
                    ? "user-reaction"
                    : ""
                }`}
                title={`${emojiTooltips[emoji] || ""} : ${pseudos.join(", ")}`}
              >
                {emoji} {pseudos.length}
              </span>
            );
          })}
        </div>
      )}

      {/* Wrapper du bouton + barre d'émojis */}
      <div className={`emoji-action-wrapper ${isOwn ? "right" : "left"}`}>
        <button
          ref={buttonRef}
          onClick={() => setShowPicker(!showPicker)}
          className="emoji-fixed-btn"
          type="button"
        >
          😊
        </button>

        {showPicker && (
          <div ref={pickerRef} className={`reaction-bar-container ${isOwn ? "open-left" : "open-right"}`}>
            <div className="emoji-pack-selector">
              <select
                id="emoji-pack-select"
                value={selectedPack}
                onChange={(e) => setSelectedPack(e.target.value)}
              >
                {Object.keys(emojiPacks).map((packKey) => (
                  <option key={packKey} value={packKey}>
                    {packKey.charAt(0).toUpperCase() + packKey.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="reaction-bar">
              {emojiPacks[selectedPack].map((emo) => (
                <button
                  key={emo}
                  className="reaction-option"
                  title={emojiTooltips[emo] || ""}
                  onClick={() => {
                    onReact?.(msg.id, emo);
                    setShowPicker(false);
                  }}
                >
                  {emo}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
