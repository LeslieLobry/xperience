import React, { useEffect, useLayoutEffect, useRef, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import "./MessageBubble.css";

/* -------------------------------------------------------
   Helpers
------------------------------------------------------- */

function formatTime(date) {
  try {
    const d = new Date(date);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  } catch {
    return "";
  }
}

function pickMsgText(msg) {
  if (!msg) return "";
  if (typeof msg.texte === "string") return msg.texte;
  if (typeof msg.text === "string") return msg.text;
  if (typeof msg.message === "string") return msg.message;
  return "";
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/* -------------------------------------------------------
   Presigned photo hook (si tu l'utilises)
------------------------------------------------------- */

function usePresignedPhoto(photoKey) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        if (!photoKey) {
          if (!cancelled) setUrl("");
          return;
        }

        const res = await fetch("/api/photos/presign-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ keys: [photoKey] }),
        });

        const data = await res.json();
        const u = data?.urls?.[photoKey] || "";
        if (!cancelled) setUrl(u);
      } catch {
        if (!cancelled) setUrl("");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [photoKey]);

  return url;
}

/* -------------------------------------------------------
   MessageBubble
------------------------------------------------------- */

function MessageBubble({
  msg,
  utilisateur,
  previousMsg,
  lastReads,
  onReact,
  onDelete,
  isMine,
  showDate,
  dateLabel,
}) {
  const pressableRef = useRef(null);

  // --- Reaction picker state / anchor ---
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [pickerAnchor, setPickerAnchor] = useState(null);

  // --- Long press mechanics ---
  const longPressTimerRef = useRef(null);
  const pressStartRef = useRef({ x: 0, y: 0 });
  const didLongPressRef = useRef(false);
  const pointerIdRef = useRef(null);

  // --- input-mode gating (évite double déclenchement touch/pointer) ---
  const lastInputModeRef = useRef(null);
  const lastInputModeTsRef = useRef(0);

  const LONG_PRESS_DELAY = 380;
  const MOVE_TOLERANCE = 28;

  const isCoarsePointer = () =>
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(pointer: coarse)").matches;

  const rememberInputMode = useCallback((mode) => {
    lastInputModeRef.current = mode;
    lastInputModeTsRef.current = Date.now();
  }, []);

  const shouldIgnoreBecauseOtherMode = useCallback((mode) => {
    const other = lastInputModeRef.current;
    const dt = Date.now() - (lastInputModeTsRef.current || 0);
    // si l'autre mode a été détecté très récemment, on ignore celui-ci
    return other && other !== mode && dt < 650;
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pointerIdRef.current = null;
  }, []);

  const unblockTouchMoveRef = useRef(null);

  const blockScrollWhilePressing = useCallback(() => {
    if (unblockTouchMoveRef.current) return;

    const handler = (ev) => {
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
    if (unblockTouchMoveRef.current) {
      unblockTouchMoveRef.current();
    }
  }, []);

  const openPickerFromEl = useCallback((el) => {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const anchor = {
      x: r.left,
      y: r.top,
      width: r.width,
      height: r.height,
      right: r.right,
      bottom: r.bottom,
    };
    setPickerAnchor(anchor);
    setReactionPickerOpen(true);
  }, []);

  const armLongPress = useCallback(
    (el, x, y) => {
      cancelLongPress();
      unblockScroll();
      didLongPressRef.current = false;

      pressStartRef.current = { x, y };

      // bloque le scroll pendant le "press"
      blockScrollWhilePressing();

      longPressTimerRef.current = setTimeout(() => {
        didLongPressRef.current = true;
        openPickerFromEl(el);
        longPressTimerRef.current = null;
      }, LONG_PRESS_DELAY);
    },
    [cancelLongPress, unblockScroll, blockScrollWhilePressing, openPickerFromEl]
  );

  const checkMoveCancel = useCallback(
    (x, y) => {
      if (!longPressTimerRef.current) return;

      const dx = x - pressStartRef.current.x;
      const dy = y - pressStartRef.current.y;
      const dist2 = dx * dx + dy * dy;

      if (dist2 > MOVE_TOLERANCE * MOVE_TOLERANCE) {
        cancelLongPress();
        unblockScroll();
      }
    },
    [cancelLongPress, unblockScroll]
  );

  const disarmLongPress = useCallback(() => {
    cancelLongPress();
    unblockScroll();
  }, [cancelLongPress, unblockScroll]);

  // --- Pointer handlers (✅ corrigé : accepte tout sauf souris + anti ghost click + leave cancel) ---
  const isMousePointer = (e) => e?.pointerType === "mouse";

  const handlePointerDown = (e) => {
    // ✅ long press sur mobile/stylet/unknown, pas sur souris
    if (isMousePointer(e)) return;

    if (shouldIgnoreBecauseOtherMode("pointer")) return;
    rememberInputMode("pointer");

    // iOS/Android : évite callout / selection
    if (isCoarsePointer()) e.preventDefault?.();

    pointerIdRef.current = e.pointerId;
    try {
      e.currentTarget?.setPointerCapture?.(e.pointerId);
    } catch {}

    armLongPress(e.currentTarget, e.clientX, e.clientY);
  };

  const handlePointerMove = (e) => {
    if (isMousePointer(e)) return;
    if (!longPressTimerRef.current) return;
    checkMoveCancel(e.clientX, e.clientY);
  };

  const finishPointer = (e) => {
    if (isMousePointer(e)) return;

    // ✅ si le long press a déclenché, on tue les “click fantômes”
    if (didLongPressRef.current) {
      e.preventDefault?.();
      e.stopPropagation?.();
    }

    disarmLongPress();
    try {
      e.currentTarget?.releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  const handlePointerUp = finishPointer;
  const handlePointerCancel = finishPointer;

  // ✅ très important: si le doigt sort de la bulle → on annule
  const handlePointerLeave = (e) => {
    if (isMousePointer(e)) return;
    disarmLongPress();
  };

  // --- Touch fallback handlers ---
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

  const handleTouchEnd = (e) => {
    // ✅ si le long press a déclenché, on tue les “click fantômes”
    if (didLongPressRef.current) {
      e?.preventDefault?.();
      e?.stopPropagation?.();
    }
    disarmLongPress();
  };

  const handleTouchCancel = () => {
    disarmLongPress();
  };

  const handleContextMenu = (e) => {
    // évite le menu contextuel (clic droit / long tap)
    if (isCoarsePointer()) e.preventDefault?.();
  };

  // --- message rendering (texte / image / audio etc.) ---
  const texte = pickMsgText(msg);
  const timeLabel = formatTime(msg?.date || msg?.createdAt);

  const reactions = msg?.reactions || [];
  const hasReactions = Array.isArray(reactions) && reactions.length > 0;

  // Exemples: si tu as une image en S3 via key
  const photoKey = msg?.photoKey || msg?.imageKey || msg?.imagePath || "";
  const presignedPhotoUrl = usePresignedPhoto(photoKey);

  // Example: group logic
  const showAvatar = !isMine && (!previousMsg || previousMsg?.auteurId !== msg?.auteurId);

  // Close picker when clicking outside (optionnel)
  useEffect(() => {
    if (!reactionPickerOpen) return;

    const onDown = (ev) => {
      // si clic/tap ailleurs → ferme
      // (tu peux affiner si tu as un composant picker spécifique)
      setReactionPickerOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [reactionPickerOpen]);

  return (
    <div className={`message-row ${isMine ? "mine" : "theirs"}`}>
      {showDate && (
        <div className="message-date-sep">
          <span>{dateLabel}</span>
        </div>
      )}

      <div className={`message-bubble ${isMine ? "mine" : "theirs"}`}>
        {!isMine && showAvatar && (
          <div className="message-avatar">
            <Image
              src={msg?.auteur?.avatarUrl || "/default.jpg"}
              alt="avatar"
              width={34}
              height={34}
              unoptimized
            />
          </div>
        )}

        <div className="message-bubble-inner">
          {/* Picker (si tu as ton composant, garde le tien) */}
          {reactionPickerOpen && pickerAnchor && (
            <div className="reaction-picker-overlay">
              {/* ICI: ton picker existant */}
              {/* Exemple minimal: */}
              <div className="reaction-picker">
                {["❤️", "😂", "😍", "😮", "😢", "👍", "👎", "🔥", "😡", "🙏", "🎉", "😉"].map((emo) => (
                  <button
                    key={emo}
                    className="reaction-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setReactionPickerOpen(false);
                      onReact?.(msg, emo);
                    }}
                  >
                    {emo}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div
            ref={pressableRef}
            className="message-content-pressable"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onPointerLeave={handlePointerLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            onContextMenu={handleContextMenu}
            onClickCapture={(e) => {
              // ✅ stoppe le click “fantôme” qui suit souvent un long press
              if (didLongPressRef.current) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          >
            {/* Contenu message */}
            {presignedPhotoUrl ? (
              <div className="message-photo">
                <Image
                  src={presignedPhotoUrl}
                  alt="photo"
                  width={260}
                  height={260}
                  unoptimized
                />
              </div>
            ) : (
              <div className="message-text">{texte}</div>
            )}

            <div className="message-meta">
              <span className="message-time">{timeLabel}</span>
              {/* Ici tu peux remettre ton statut (envoyé/reçu/vu) si tu l’as */}
            </div>
          </div>

          {hasReactions && (
            <div className="message-reactions">
              {reactions.map((r, i) => (
                <span key={`${r?.emoji || r}-${i}`} className="reaction-pill">
                  {r?.emoji || r}
                </span>
              ))}
            </div>
          )}

          {/* Exemple de bouton delete (si tu l’avais déjà, garde-le comme avant) */}
          {!!onDelete && isMine && (
            <button
              className="message-delete"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete?.(msg);
              }}
            >
              Supprimer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default MessageBubble;
