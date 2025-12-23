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
      .then((res) => res.json())
      .then((data) => setUrl(data.url || "/default.jpg"))
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
  emojiPack = "app", // ✅ par défaut: mêmes emojis que l'app
  prenomsCouple = null,
}) {
  /* ---------------------------------------------------------------------- */
  /*                             Packs d'emoji                              */
  /* ---------------------------------------------------------------------- */

  // ✅ Emojis "comme sur l'app"
  const emojiPacks = {
    app: ["❤️", "😂", "😍", "😮", "😢", "👍", "👎", "🔥", "😡", "🙏", "🎉", "😉"],

    // (on garde tes packs existants au cas où)
    sexy: ["😍", "😈", "💋", "👀", "💦", "🍑"],
    glamour: ["🖤", "🥂", "🥀", "🪩", "🎭", "🫣"],
    erotique: ["🫦", "🍆", "🍒", "🥵", "🛏️", "🧴"],
    sensuel: ["🫶", "🪶", "🎀", "🤤", "😮‍💨", "👄"],
  };

  const emojiTooltips = {
    // ✅ Tooltips "app"
    "❤️": "J’adore",
    "😂": "Trop drôle",
    "😍": "J’aime",
    "😮": "Oh wow",
    "😢": "Triste",
    "👍": "Top",
    "👎": "Bof",
    "🔥": "Ça chauffe",
    "😡": "Pas content",
    "🙏": "Merci / stp",
    "🎉": "Yes !",
    "😉": "Clin d’œil",

    // (on garde tes tooltips existants)
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

  const activePack = emojiPacks[emojiPack] || emojiPacks.app;

  /* ---------------------------------------------------------------------- */
  /*                        État & refs pour le picker                      */
  /* ---------------------------------------------------------------------- */

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const pickerRef = useRef(null);
  const triggerRef = useRef(null);

  // Appui long (mobile + desktop)
  const longPressTimerRef = useRef(null);
  const LONG_PRESS_DELAY = 450; // ms

  const startLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = setTimeout(() => {
      setIsPickerOpen(true);
    }, LONG_PRESS_DELAY);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Fermeture du picker quand on clique en dehors
  useEffect(() => {
    function handleClickOutside(event) {
      if (!isPickerOpen) return;
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        setIsPickerOpen(false);
      }
    }

    function handleEsc(e) {
      if (e.key === "Escape") setIsPickerOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);

      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, [isPickerOpen]);

  /* ---------------------------------------------------------------------- */
  /*                    Infos message / auteur / status                     */
  /* ---------------------------------------------------------------------- */

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

  // Avatar auteur
  const auteurPhotoUrl = usePresignedPhoto(msg.auteur?.photoUrl);

  // Fichiers message
  const imageMsgUrl = usePresignedPhoto(
    msg.type === "IMAGE" ? msg.imageUrl : null
  );
  const audioMsgUrl = usePresignedPhoto(
    msg.type === "AUDIO" ? msg.audioUrl : null
  );

  // Regroupement des réactions par emoji (emoji + total)
  const groupedReactions = Object.entries(
    (msg.reactions || []).reduce((acc, r) => {
      if (!acc[r.emoji]) acc[r.emoji] = new Set();
      acc[r.emoji].add(r.utilisateurId);
      return acc;
    }, {})
  );

  /* ---------------------------------------------------------------------- */
  /*                    Types spéciaux : EPHEMERE / SYSTEME                 */
  /* ---------------------------------------------------------------------- */

  if (msg.type === "EPHEMERE") {
    return (
      <MessageEphemere
        msg={msg}
        onDelete={onDelete}
        utilisateurId={utilisateur.id}
      />
    );
  }

  if (msg.type === "SYSTEME") {
    return (
      <div className="message-systeme">
        <span>📝 {msg.texte || msg.contenu}</span>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /*                                RENDER                                  */
  /* ---------------------------------------------------------------------- */

  return (
    <div className={`message-bubble ${isOwn ? "own" : "other"}`}>
      {/* Auteur (avatar + pseudo / prénom) */}
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
              <span className="author-name">
                {msg.auteur?.pseudo || "Utilisateur"}
              </span>
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

      {/* ✅ Zone d'appui long sur la bulle (comme l'app) */}
      <div
        className="message-content-pressable"
        onMouseDown={startLongPress}
        onMouseUp={cancelLongPress}
        onMouseLeave={cancelLongPress}
        onMouseMove={cancelLongPress} // ✅ évite ouverture si tu “glisses”
        onTouchStart={startLongPress}
        onTouchEnd={cancelLongPress}
        onTouchCancel={cancelLongPress}
        onTouchMove={cancelLongPress} // ✅ évite ouverture pendant scroll
      >
        {/* Contenu du message : image / audio / texte */}
        {msg.type === "IMAGE" && msg.imageUrl ? (
          <img
            src={imageMsgUrl || "/default.jpg"}
            alt="image envoyée"
            className="message-image"
          />
        ) : msg.type === "AUDIO" && msg.audioUrl ? (
          <MessageAudio url={audioMsgUrl} duration={msg.duree || "0:00"} />
        ) : (
          <p className="message-text">{msg.contenu}</p>
        )}
      </div>

      {/* Bouton supprimer (uniquement pour ses propres messages) */}
      {isOwn && (
        <button
          className="delete-message-button"
          onClick={() => onDelete?.(msg.id)}
          title="Supprimer ce message"
          type="button"
        >
          🗑️
        </button>
      )}

      {/* Réactions agrégées sous la bulle */}
      {groupedReactions.length > 0 && (
        <div className="message-reactions">
          {groupedReactions.map(([emoji, utilisateursSet]) => {
            const nb = utilisateursSet.size;
            const userHasReacted = msg.reactions?.some(
              (r) => r.emoji === emoji && r.utilisateurId === utilisateur.id
            );

            return (
              <span
                key={emoji}
                className={`reaction-item ${
                  userHasReacted ? "user-reaction" : ""
                }`}
                title={
                  (emojiTooltips[emoji] || "") +
                  " — " +
                  (nb > 1 ? `${nb} personnes` : "1 personne")
                }
                onClick={() => {
                  // toggle possible côté backend si tu gères
                  onReact?.(msg.id, emoji);
                }}
              >
                <span>{emoji}</span>
                <span>{nb}</span>
              </span>
            );
          })}
        </div>
      )}

      {/* (fallback) bouton réaction desktop */}
      <button
        ref={triggerRef}
        className="message-react-btn"
        type="button"
        onClick={() => setIsPickerOpen((prev) => !prev)}
        aria-label="Réagir à ce message"
        title="Réagir"
      >
        😊
      </button>

      {/* Picker d’emoji */}
      {isPickerOpen && (
        <div ref={pickerRef} className="reaction-picker">
          {activePack.map((emo) => (
            <button
              key={emo}
              type="button"
              className="reaction-option"
              title={emojiTooltips[emo] || ""}
              onClick={() => {
                onReact?.(msg.id, emo);
                setIsPickerOpen(false);
              }}
            >
              {emo}
            </button>
          ))}
        </div>
      )}

      {/* Heure + statut (vu / reçu / envoyé) */}
      <div className="message-meta">
        <span className="message-time">{heure}</span>
        {isOwn && <span className="message-status">{statutTexte}</span>}
      </div>
    </div>
  );
}
