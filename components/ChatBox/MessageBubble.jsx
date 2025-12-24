import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  /* ✅ Emojis "comme sur l'app" */
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

  /* ---------------- Picker : mobile = appui long / desktop = bouton ---------------- */
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerPos, setPickerPos] = useState(null); // { x, y }
  const pickerRef = useRef(null);
  const pressableRef = useRef(null);

  // ✅ bouton desktop 😊
  const triggerRef = useRef(null);

  /* ---------- Long press (FIABLE) ---------- */
  const longPressTimerRef = useRef(null);
  const pressStartRef = useRef({ x: 0, y: 0 });
  const pointerIdRef = useRef(null);

  const LONG_PRESS_DELAY = 450;
  const MOVE_TOLERANCE = 12; // ✅ tolérance micro-mouvements (sinon 1/10)

  const openPickerFromEl = (el) => {
    const rect = el?.getBoundingClientRect?.();
    if (!rect) {
      setPickerPos(null);
      setIsPickerOpen(true);
      return;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // centre horizontal de la bulle/bouton
    let x = rect.left + rect.width / 2;

    // au-dessus, sinon en-dessous
    const yAbove = rect.top - 62;
    let y = yAbove >= 8 ? yAbove : rect.bottom + 10;

    // clamp basique (on reclamp après mesure du picker)
    x = clamp(x, 8, vw - 8);
    y = clamp(y, 8, vh - 8);

    setPickerPos({ x, y });
    setIsPickerOpen(true);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pointerIdRef.current = null;
  };

  const isCoarsePointer = () =>
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(pointer: coarse)").matches;

  const handlePointerDown = (e) => {
    // ✅ On veut le long-press uniquement au touch (pas souris)
    if (e.pointerType && e.pointerType !== "touch") return;

    // évite le menu contextuel iOS/Android qui flingue le long press
    if (isCoarsePointer()) e.preventDefault?.();

    cancelLongPress();

    pressStartRef.current = { x: e.clientX, y: e.clientY };
    pointerIdRef.current = e.pointerId;

    // ✅ capture: on continue de recevoir move/up même si le doigt glisse légèrement
    e.currentTarget?.setPointerCapture?.(e.pointerId);

    longPressTimerRef.current = setTimeout(() => {
      openPickerFromEl(e.currentTarget);
      longPressTimerRef.current = null;
    }, LONG_PRESS_DELAY);
  };

  const handlePointerMove = (e) => {
    if (e.pointerType && e.pointerType !== "touch") return;
    if (!longPressTimerRef.current) return;

    const dx = Math.abs(e.clientX - pressStartRef.current.x);
    const dy = Math.abs(e.clientY - pressStartRef.current.y);

    // ✅ on n’annule QUE si ça bouge vraiment (scroll / glisser)
    if (dx > MOVE_TOLERANCE || dy > MOVE_TOLERANCE) cancelLongPress();
  };

  const handlePointerUp = (e) => {
    if (e.pointerType && e.pointerType !== "touch") return;
    cancelLongPress();
    try {
      e.currentTarget?.releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  const handlePointerCancel = (e) => {
    if (e.pointerType && e.pointerType !== "touch") return;
    cancelLongPress();
    try {
      e.currentTarget?.releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  const handleContextMenu = (e) => {
    // ✅ empêche le menu “copier/partager” qui casse le long press sur mobile
    if (isCoarsePointer()) e.preventDefault();
  };

  // ✅ Reset scroll + reclamp APRÈS rendu (plus fiable sur mobile)
  useLayoutEffect(() => {
    if (!isPickerOpen) return;

    let raf1 = 0;
    let raf2 = 0;

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const el = pickerRef.current;

        if (el) {
          // ✅ toujours afficher le début (❤️ 😂 😍 ...)
          el.scrollLeft = 0;
          el.scrollTo?.({ left: 0, behavior: "auto" });
        }

        if (pickerPos && el) {
          const pr = el.getBoundingClientRect();
          const margin = 8;
          const vw = window.innerWidth;
          const vh = window.innerHeight;

          let x = clamp(
            pickerPos.x,
            margin + pr.width / 2,
            vw - margin - pr.width / 2
          );
          let y = clamp(pickerPos.y, margin, vh - margin - pr.height);

          if (x !== pickerPos.x || y !== pickerPos.y) setPickerPos({ x, y });
        }
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [isPickerOpen]); // (on garde ton comportement)

  // fermeture click dehors + ESC
  useEffect(() => {
    function handleClickOutside(e) {
      if (!isPickerOpen) return;

      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target) &&
        pressableRef.current &&
        !pressableRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
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
      cancelLongPress();
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

      {/* ✅ Mobile: appui long fiable via Pointer Events */}
      <div
        ref={pressableRef}
        className="message-content-pressable"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onContextMenu={handleContextMenu}
      >
        {msg.type === "IMAGE" && msg.imageUrl ? (
          <img
            src={imageMsgUrl || "/default.jpg"}
            alt="image envoyée"
            className="message-image"
            draggable={false}
          />
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
                title={
                  (emojiTooltips[emoji] || "") +
                  " — " +
                  (nb > 1 ? `${nb} personnes` : "1 personne")
                }
                onClick={() => onReact?.(msg.id, emoji)}
              >
                <span>{emoji}</span>
                <span>{nb}</span>
              </span>
            );
          })}
        </div>
      )}

      {/* ✅ Desktop: bouton 😊 (affiché uniquement via CSS) */}
      <button
        ref={triggerRef}
        className="message-react-btn"
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isPickerOpen) setIsPickerOpen(false);
          else openPickerFromEl(triggerRef.current);
        }}
        aria-label="Réagir"
        title="Réagir"
      >
        😊
      </button>

      {/* ✅ Picker (fixed, LTR, jamais coupé) */}
      {isPickerOpen && (
        <div
          ref={pickerRef}
          className="reaction-picker reaction-picker-fixed"
          style={
            pickerPos
              ? {
                  left: pickerPos.x,
                  top: pickerPos.y,
                  transform: "translateX(-50%)",
                }
              : undefined
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
