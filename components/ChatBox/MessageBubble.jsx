import { useEffect, useRef, useState } from "react";
import MessageAudio from "../MessageAudio/MessageAudio";
import MessageEphemere from "../MessageEphemere/MessageEphemere";
import "./MessageBubble.css";

function usePresignedPhoto(photoKey) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!photoKey) return setUrl("/default.jpg");
    if (photoKey.startsWith("http")) {
      setUrl(photoKey);
      return;
    }
    fetch("/api/photos/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: photoKey }),
    })
      .then(res => res.json())
      .then(data => setUrl(data.url || "/default.jpg"))
      .catch(() => setUrl("/default.jpg"));
  }, [photoKey]);

  return url;
}

export default function MessageBubble({
  msg,
  utilisateur,
  previousMsg,
  lastReads,
  onReact,
  onDelete,
  emojiPack = "sexy",
  prenomsCouple = null,
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
  const auteurIsCouple = msg.auteur?.type === "couple";
  const showAuthorInfo =
    auteurIsCouple ||
    !previousMsg ||
    previousMsg.auteurId !== msg.auteurId ||
    previousMsg.prenomEnvoyeur !== msg.prenomEnvoyeur;

  const heure = msg.createdAt
    ? new Date(msg.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  let statutTexte = "";
  if (isOwn && lastReads) {
    const autresLecteurs = lastReads.filter((r) => r.utilisateurId !== utilisateur.id);
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

  // 1️⃣  Prépare presigned pour l'avatar auteur
  const auteurPhotoUrl = usePresignedPhoto(msg.auteur?.photoUrl);

  // 2️⃣  Prépare presigned pour les images et l'audio du message
  const imageMsgUrl = usePresignedPhoto(msg.type === "IMAGE" ? msg.imageUrl : null);
  const audioMsgUrl = usePresignedPhoto(msg.type === "AUDIO" ? msg.audioUrl : null);

  // Regroupement des réactions par emoji, avec nombre d'utilisateurs
  const groupedReactions = Object.entries(
    (msg.reactions || []).reduce((acc, r) => {
      if (!acc[r.emoji]) acc[r.emoji] = new Set();
      acc[r.emoji].add(r.utilisateurId);
      return acc;
    }, {})
  );

  // Affichage du message éphémère via MessageEphemere
  if (msg.type === "EPHEMERE") {
    return <MessageEphemere msg={msg} onDelete={onDelete} utilisateurId={utilisateur.id} />;
  }
  // Si c'est un message SYSTEME, on affiche centré & spécial, puis on s'arrête là
  if (msg.type === "SYSTEME") {
    return (
      <div className="message-systeme">
        <span>📝 {msg.texte || msg.contenu}</span>
      </div>
    );
  }

  return (
    <div className={`message-bubble ${isOwn ? "own" : "other"}`}>
      {showAuthorInfo && (
        <div className="author-info">
          <img
            src={auteurPhotoUrl || "/default.jpg"}
            alt={msg.auteur?.pseudo || "Utilisateur"}
            className="author-avatar"
          />
          <div>
            {msg.prenomEnvoyeur ? (
              <span className="author-name">{msg.prenomEnvoyeur}</span>
            ) : (
              <span className="author-name">{msg.auteur?.pseudo || "Utilisateur"}</span>
            )}
            {auteurIsCouple && prenomsCouple && (
              <span
                className="author-couple-names"
                style={{
                  marginLeft: 4,
                  color: "#b5a06c",
                  fontSize: "0.95em",
                  fontStyle: "italic",
                }}
              >
                ({prenomsCouple})
              </span>
            )}
          </div>
        </div>
      )}

      {/* IMAGE ou AUDIO */}
      {msg.type === "IMAGE" && msg.imageUrl ? (
        <img src={imageMsgUrl || "/default.jpg"} alt="image envoyée" className="message-image" />
      ) : msg.type === "AUDIO" && msg.audioUrl ? (
        <>
          <MessageAudio url={audioMsgUrl} duration={msg.duree || "0:00"} />
        </>
      ) : (
        <p className="message-text">{msg.contenu}</p>
      )}

      {isOwn && (
        <button
          className="delete-message-button"
          onClick={() => {
            onDelete?.(msg.id);
          }}
          title="Supprimer ce message"
        >
          🗑️
        </button>
      )}

      <div className="div-react">
        {/* Affichage des réactions */}
        <div className={`emoji-action-wrapper ${isOwn ? "right" : "left"}`}>
          <button
            ref={buttonRef}
            onClick={() => setShowPicker(!showPicker)}
            className="emoji-fixed-btn"
            type="button"
          >
            😊
          </button>
          {groupedReactions.length > 0 && (
            <div className="message-reactions">
              {groupedReactions.map(([emoji, utilisateursSet]) => {
                const nb = utilisateursSet.size;
                return (
                  <span
                    key={emoji}
                    className={`reaction-item ${
                      msg.reactions?.some(
                        (r) => r.emoji === emoji && r.utilisateurId === utilisateur.id
                      )
                        ? "user-reaction"
                        : ""
                    }`}
                    title={
                      (emojiTooltips[emoji] || "") +
                      " — " +
                      (nb > 1 ? `${nb} personnes` : "1 personne")
                    }
                  >
                    {emoji} {nb}
                  </span>
                );
              })}
            </div>
          )}

          {/* Barre d'émojis */}
          {showPicker && (
            <div
              ref={pickerRef}
              className={`reaction-bar-container ${isOwn ? "open-left" : "open-right"}`}
            >
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

      <div className="message-meta">
        <span className="message-time">{heure}</span>
        {isOwn && <span className="message-status">{statutTexte}</span>}
      </div>
    </div>
  );
}
