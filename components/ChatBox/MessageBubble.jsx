import { useEffect, useRef, useState } from "react";
import MessageAudio from "../MessageAudio/MessageAudio";
import MessageEphemere from "../MessageEphemere/MessageEphemere";
import "./MessageBubble.css";

function usePresignedPhoto(photoKey) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!photoKey) return setUrl("/default.jpg");
    if (photoKey.startsWith("http")) return setUrl(photoKey);

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

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function MessageBubble({
  msg,
  utilisateur,
  previousMsg,
  lastReads,
  onReact,
  onDelete,
  emojiPack = "app",
  prenomsCouple = null,
}) {
  /* --------------------- Pack emojis (comme l'app) --------------------- */
  const emojiPacks = {
    app: ["❤️", "😂", "😍", "😮", "😢", "👍", "👎", "🔥", "😡", "🙏", "🎉", "😉"],
    sexy: ["😍", "😈", "💋", "👀", "💦", "🍑"],
    glamour: ["🖤", "🥂", "🥀", "🪩", "🎭", "🫣"],
    erotique: ["🫦", "🍆", "🍒", "🥵", "🛏️", "🧴"],
    sensuel: ["🫶", "🪶", "🎀", "🤤", "😮‍💨", "👄"],
  };

  const emojiTooltips = {
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
  };

  const activePack = emojiPacks[emojiPack] || emojiPacks.app;

  /* ------------------------- Picker état / refs ------------------------- */
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerPos, setPickerPos] = useState(null); // { x, y }

  const pickerRef = useRef(null);
  const pressableRef = useRef(null);

  const longPressTimerRef = useRef(null);
  const LONG_PRESS_DELAY = 450;

  const computeAndOpenPicker = (el) => {
    try {
      const rect = el?.getBoundingClientRect?.();
      if (!rect) {
        setPickerPos(null);
        setIsPickerOpen(true);
        return;
      }

      const x = rect.left + rect.width / 2;

      // Essaye au-dessus, sinon en-dessous
      const yAbove = rect.top - 62;
      const y = yAbove >= 10 ? yAbove : rect.bottom + 10;

      setPickerPos({ x, y });
      setIsPickerOpen(true);
    } catch {
      setPickerPos(null);
      setIsPickerOpen(true);
    }
  };

  const startLongPress = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      computeAndOpenPicker(pressableRef.current);
    }, LONG_PRESS_DELAY);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // ✅ À l’ouverture: force le début (❤️…) et clamp position dans l’écran
  useEffect(() => {
    if (!isPickerOpen) return;

    const raf = requestAnimationFrame(() => {
      if (pickerRef.current) {
        // ✅ important: en RTL, scrollLeft est inversé selon les navigateurs
        // donc on force LTR sur le picker + on remet au début.
        pickerRef.current.scrollTo?.({ left: 0 });
        pickerRef.current.scrollLeft = 0;
      }

      if (pickerPos && pickerRef.current) {
        const pr = pickerRef.current.getBoundingClientRect();
        const margin = 8;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let x = clamp(pickerPos.x, margin + pr.width / 2, vw - margin - pr.width / 2);
        let y = clamp(pickerPos.y, margin, vh - margin - pr.height);

        if (x !== pickerPos.x || y !== pickerPos.y) setPickerPos({ x, y });
      }
    });

    return () => cancelAnimationFrame(raf);
  }, [isPickerOpen]);

  // Fermeture click dehors + ESC
  useEffect(() => {
    function handleClickOutside(e) {
      if (!isPickerOpen) return;
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target) &&
        pressableRef.current &&
        !pressableRef.current.contains(e.target)
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
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, [isPickerOpen]);

  /* --------------------------- Infos message --------------------------- */
  const isOwn = msg.auteurId === utilisateur.id;
  const auteurIsCouple = msg.auteur?.type === "couple";

  const showAuthorInfo =
    auteurIsCouple ||
    !previousMsg ||
    previousMsg.auteurId !== msg.auteurId ||
    previousMsg.prenomEnvoyeur !== msg.prenomEnvoyeur;

  const heure = msg.createdAt
    ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  let statutTexte = "";
  if (isOwn && lastReads) {
    const autresLecteurs = lastReads.filter((r) => r.utilisateurId !== utilisateur.id);
    const lus = autresLecteurs.filter(
      (r) => r.lastReadAt && new Date(r.lastReadAt) > new Date(msg.createdAt)
    );
    if (lus.length === autresLecteurs.length && lus.length > 0) statutTexte = "✔✔ Vu";
    else if (lus.length > 0) statutTexte = "✔✔ Reçu";
    else statutTexte = "✔ Envoyé";
  }

  const auteurPhotoUrl = usePresignedPhoto(msg.auteur?.photoUrl);
  const imageMsgUrl = usePresignedPhoto(msg.type === "IMAGE" ? msg.imageUrl : null);
  const audioMsgUrl = usePresignedPhoto(msg.type === "AUDIO" ? msg.audioUrl : null);

  const groupedReactions = Object.entries(
    (msg.reactions || []).reduce((acc, r) => {
      if (!acc[r.emoji]) acc[r.emoji] = new Set();
      acc[r.emoji].add(r.utilisateurId);
      return acc;
    }, {})
  );

  /* --------------------- Types spéciaux: EPHEMERE ---------------------- */
  if (msg.type === "EPHEMERE") {
    return <MessageEphemere msg={msg} onDelete={onDelete} utilisateurId={utilisateur.id} />;
  }

  if (msg.type === "SYSTEME") {
    return (
      <div className="message-systeme">
        <span>📝 {msg.texte || msg.contenu}</span>
      </div>
    );
  }

  /* -------------------------------- Render ----------------------------- */
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
                style={{ marginLeft: 4, color: "#b5a06c", fontSize: "0.95em", fontStyle: "italic" }}
              >
                ({prenomsCouple})
              </span>
            )}
          </div>
        </div>
      )}

      {/* ✅ Appui long UNIQUEMENT sur la bulle */}
      <div
        ref={pressableRef}
        className="message-content-pressable"
        onMouseDown={startLongPress}
        onMouseUp={cancelLongPress}
        onMouseLeave={cancelLongPress}
        onMouseMove={cancelLongPress}
        onTouchStart={startLongPress}
        onTouchEnd={cancelLongPress}
        onTouchCancel={cancelLongPress}
        onTouchMove={cancelLongPress}
      >
        {msg.type === "IMAGE" && msg.imageUrl ? (
          <img src={imageMsgUrl || "/default.jpg"} alt="image envoyée" className="message-image" />
        ) : msg.type === "AUDIO" && msg.audioUrl ? (
          <MessageAudio url={audioMsgUrl} duration={msg.duree || "0:00"} />
        ) : (
          <p className="message-text">{msg.contenu}</p>
        )}
      </div>

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
                className={`reaction-item ${userHasReacted ? "user-reaction" : ""}`}
                title={(emojiTooltips[emoji] || "") + " — " + (nb > 1 ? `${nb} personnes` : "1 personne")}
                onClick={() => onReact?.(msg.id, emoji)}
              >
                <span>{emoji}</span>
                <span>{nb}</span>
              </span>
            );
          })}
        </div>
      )}

      {/* ✅ Picker: fixed + LTR + scroll */}
      {isPickerOpen && (
        <div
          ref={pickerRef}
          className="reaction-picker"
          style={
            pickerPos
              ? {
                  position: "fixed",
                  left: pickerPos.x,
                  top: pickerPos.y,
                  transform: "translateX(-50%)",
                  maxWidth: "calc(100vw - 16px)",
                  overflowX: "auto",
                  overflowY: "hidden",
                  zIndex: 9999,
                  WebkitOverflowScrolling: "touch",

                  // ✅ crucial: ne pas hériter du RTL/row-reverse
                  direction: "ltr",
                  unicodeBidi: "isolate",
                }
              : {
                  direction: "ltr",
                  unicodeBidi: "isolate",
                }
          }
        >
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

      <div className="message-meta">
        <span className="message-time">{heure}</span>
        {isOwn && <span className="message-status">{statutTexte}</span>}
      </div>
    </div>
  );
}
