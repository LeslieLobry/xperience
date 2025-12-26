import React, { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from "react";
import MessageAudio from "../MessageAudio/MessageAudio";
import MessageEphemere from "../MessageEphemere/MessageEphemere";
import "./MessageBubble.css";

/* =========================================================
   ✅ PERF: cache global + inflight pour presign (1 requête/key)
   ========================================================= */
const PRESIGN_CACHE = new Map();     // key -> url
const PRESIGN_INFLIGHT = new Map();  // key -> Promise

function usePresignedPhoto(photoKey) {
  const [url, setUrl] = useState(() => {
    if (!photoKey) return "/default.jpg";
    if (typeof photoKey === "string" && photoKey.startsWith("http")) return photoKey;
    return PRESIGN_CACHE.get(photoKey) || null;
  });

  useEffect(() => {
    if (!photoKey) {
      setUrl("/default.jpg");
      return;
    }

    if (typeof photoKey === "string" && photoKey.startsWith("http")) {
      setUrl(photoKey);
      return;
    }

    const cached = PRESIGN_CACHE.get(photoKey);
    if (cached) {
      setUrl(cached);
      return;
    }

    let p = PRESIGN_INFLIGHT.get(photoKey);
    if (!p) {
      p = fetch("/api/photos/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: photoKey }),
      })
        .then((res) => res.json())
        .then((data) => {
          const finalUrl = data?.url || "/default.jpg";
          PRESIGN_CACHE.set(photoKey, finalUrl);
          return finalUrl;
        })
        .catch(() => "/default.jpg")
        .finally(() => {
          PRESIGN_INFLIGHT.delete(photoKey);
        });

      PRESIGN_INFLIGHT.set(photoKey, p);
    }

    p.then((finalUrl) => setUrl(finalUrl));
  }, [photoKey]);

  return url;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function MessageBubble({
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

  /* ---------------- Picker ---------------- */
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerPos, setPickerPos] = useState(null); // { x, y }
  const pickerRef = useRef(null);
  const pressableRef = useRef(null);

  // ✅ bouton desktop 😊
  const triggerRef = useRef(null);

  /* ---------- Long press (ULTRA FIABLE) ---------- */
  const longPressTimerRef = useRef(null);
  const pressStartRef = useRef({ x: 0, y: 0 });
  const pointerIdRef = useRef(null);

  // ✅ pour empêcher le "tap" final de fermer le picker
  const didLongPressRef = useRef(false);

  // ✅ blocage scroll pendant armement
  const unblockTouchMoveRef = useRef(null);

  // ✅ évite double déclenchement pointer+touch
  const inputModeRef = useRef(null); // "pointer" | "touch"
  const inputModeTsRef = useRef(0);

  const LONG_PRESS_DELAY = 380; // ⬅️ un poil plus rapide
  const MOVE_TOLERANCE = 28;    // ⬅️ plus permissif (micro-mouvements doigt)

  const isCoarsePointer = () =>
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(pointer: coarse)").matches;

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pointerIdRef.current = null;
  }, []);

  const blockScrollWhilePressing = useCallback(() => {
    if (unblockTouchMoveRef.current) return;

    const handler = (ev) => {
      // on bloque le scroll uniquement tant que le long-press est "armé"
      if (longPressTimerRef.current) {
        ev.preventDefault();
      }
    };

    document.addEventListener("touchmove", handler, { passive: false });

    unblockTouchMoveRef.current = () => {
      document.removeEventListener("touchmove", handler);
      unblockTouchMoveRef.current = null;
    };
  }, []);

  const unblockScroll = useCallback(() => {
    if (unblockTouchMoveRef.current) unblockTouchMoveRef.current();
  }, []);

  const openPickerFromEl = useCallback((el) => {
    const rect = el?.getBoundingClientRect?.();
    if (!rect) {
      setPickerPos(null);
      setIsPickerOpen(true);
      return;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // centre horizontal
    let x = rect.left + rect.width / 2;

    // au-dessus sinon en-dessous
    const yAbove = rect.top - 62;
    let y = yAbove >= 8 ? yAbove : rect.bottom + 10;

    x = clamp(x, 8, vw - 8);
    y = clamp(y, 8, vh - 8);

    setPickerPos({ x, y });
    setIsPickerOpen(true);
  }, []);

  const rememberInputMode = (mode) => {
    inputModeRef.current = mode;
    inputModeTsRef.current = Date.now();
  };

  const shouldIgnoreBecauseOtherMode = (mode) => {
    // si on vient de déclencher touch, on ignore pointer pendant 800ms (et inversement)
    const last = inputModeRef.current;
    const dt = Date.now() - (inputModeTsRef.current || 0);
    return last && last !== mode && dt < 800;
  };

  const armLongPress = useCallback((el, x, y) => {
    didLongPressRef.current = false;

    cancelLongPress();
    blockScrollWhilePressing();

    pressStartRef.current = { x, y };

    longPressTimerRef.current = setTimeout(() => {
      didLongPressRef.current = true;
      openPickerFromEl(el);
      longPressTimerRef.current = null;
    }, LONG_PRESS_DELAY);
  }, [cancelLongPress, blockScrollWhilePressing, openPickerFromEl]);

  const checkMoveCancel = useCallback((x, y) => {
    if (!longPressTimerRef.current) return;

    const dx = x - pressStartRef.current.x;
    const dy = y - pressStartRef.current.y;
    const dist2 = dx * dx + dy * dy;

    // ✅ annule seulement si on bouge "vraiment"
    if (dist2 > MOVE_TOLERANCE * MOVE_TOLERANCE) {
      cancelLongPress();
      unblockScroll();
    }
  }, [cancelLongPress, unblockScroll]);

  const disarmLongPress = useCallback(() => {
    cancelLongPress();
    unblockScroll();
  }, [cancelLongPress, unblockScroll]);

  /* ---------------- POINTER (quand dispo) ---------------- */
  const handlePointerDown = (e) => {
    // long-press uniquement sur touch
    if (e.pointerType && e.pointerType !== "touch") return;

    if (shouldIgnoreBecauseOtherMode("pointer")) return;
    rememberInputMode("pointer");

    // évite le menu contextuel (iOS/Android)
    if (isCoarsePointer()) e.preventDefault?.();

    pointerIdRef.current = e.pointerId;

    // capture = on garde move/up même si ça glisse un peu
    try {
      e.currentTarget?.setPointerCapture?.(e.pointerId);
    } catch {}

    armLongPress(e.currentTarget, e.clientX, e.clientY);
  };

  const handlePointerMove = (e) => {
    if (e.pointerType && e.pointerType !== "touch") return;
    checkMoveCancel(e.clientX, e.clientY);
  };

  const handlePointerUp = (e) => {
    if (e.pointerType && e.pointerType !== "touch") return;
    disarmLongPress();
    try {
      e.currentTarget?.releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  const handlePointerCancel = (e) => {
    if (e.pointerType && e.pointerType !== "touch") return;
    disarmLongPress();
    try {
      e.currentTarget?.releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  /* ---------------- TOUCH FALLBACK (Safari/Android capricieux) ---------------- */
  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length !== 1) return;

    if (shouldIgnoreBecauseOtherMode("touch")) return;
    rememberInputMode("touch");

    const t = e.touches[0];
    armLongPress(e.currentTarget, t.clientX, t.clientY);
  };

  const handleTouchMove = (e) => {
    if (!e.touches || e.touches.length !== 1) return;
    const t = e.touches[0];
    checkMoveCancel(t.clientX, t.clientY);
  };

  const handleTouchEnd = () => {
    disarmLongPress();
  };

  const handleTouchCancel = () => {
    disarmLongPress();
  };

  const handleContextMenu = (e) => {
    // empêche menu copier/partager sur long press mobile
    if (isCoarsePointer()) e.preventDefault();
  };

  /* ✅ Reposition + reset scroll du picker (évite “emoji coupés”) */
  useLayoutEffect(() => {
    if (!isPickerOpen) return;

    let raf1 = 0;
    let raf2 = 0;

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const el = pickerRef.current;

        if (el) {
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
  }, [isPickerOpen, pickerPos]);

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
      unblockScroll();
    };
  }, [isPickerOpen, cancelLongPress, unblockScroll]);

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

  // ✅ PERF: calc statut via useMemo
  const statutTexte = useMemo(() => {
    if (!isOwn || !lastReads || !msg.createdAt) return "";
    const autresLecteurs = lastReads.filter((r) => r.utilisateurId !== utilisateur.id);
    if (!autresLecteurs.length) return "✔ Envoyé";

    const msgTime = new Date(msg.createdAt).getTime();
    let lus = 0;

    for (const r of autresLecteurs) {
      if (!r?.lastReadAt) continue;
      if (new Date(r.lastReadAt).getTime() > msgTime) lus++;
    }

    if (lus === autresLecteurs.length && lus > 0) return "✔✔ Vu";
    if (lus > 0) return "✔✔ Reçu";
    return "✔ Envoyé";
  }, [isOwn, lastReads, msg.createdAt, utilisateur.id]);

  const auteurPhotoUrl = usePresignedPhoto(msg.auteur?.photoUrl);
  const imageMsgUrl = usePresignedPhoto(msg.type === "IMAGE" ? msg.imageUrl : null);
  const audioMsgUrl = usePresignedPhoto(msg.type === "AUDIO" ? msg.audioUrl : null);

  // ✅ PERF: groupedReactions en memo
  const groupedReactions = useMemo(() => {
    return Object.entries(
      (msg.reactions || []).reduce((acc, r) => {
        if (!acc[r.emoji]) acc[r.emoji] = new Set();
        acc[r.emoji].add(r.utilisateurId);
        return acc;
      }, {})
    );
  }, [msg.reactions]);

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

      {/* ✅ Mobile: appui long ultra fiable (pointer + touch fallback) */}
      <div
        ref={pressableRef}
        className="message-content-pressable"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onContextMenu={handleContextMenu}
        onClickCapture={(e) => {
          // ✅ évite que le tap final ferme le picker via "click outside"
          if (didLongPressRef.current) {
            e.preventDefault();
            e.stopPropagation();
            didLongPressRef.current = false;
          }
        }}
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

      {/* ✅ Desktop: bouton 😊 */}
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

export default React.memo(MessageBubble);
