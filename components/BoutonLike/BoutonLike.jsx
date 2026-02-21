"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import "./BoutonLike.css";

export default function BoutonLike({ cibleId, onChange, showLabel = true }) {
  const [hasLiked, setHasLiked] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ Toast overlay + burst
  const [toast, setToast] = useState({ open: false, text: "", sub: "", type: "success" });
  const [burstOn, setBurstOn] = useState(false);
  const toastTimerRef = useRef(null);
  const burstTimerRef = useRef(null);

  const openToast = useCallback((text, sub = "", type = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);

    setToast({ open: true, text, sub, type });

    toastTimerRef.current = setTimeout(() => {
      setToast((t) => ({ ...t, open: false }));
    }, 1800);
  }, []);

  const triggerBurst = useCallback(() => {
    if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
    setBurstOn(true);
    burstTimerRef.current = setTimeout(() => setBurstOn(false), 650);
  }, []);

  const checkLike = useCallback(async () => {
    if (!cibleId) return;

    try {
      const res = await fetch(`/api/utilisateur/${cibleId}/has-liked`, {
        credentials: "include",
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        const value = !!data.hasLiked;
        setHasLiked(value);
        onChange?.(value);
      } else {
        setHasLiked(false);
        onChange?.(false);
      }
    } catch (err) {
      console.error("Erreur checkLike", err);
      setHasLiked(false);
      onChange?.(false);
    }
  }, [cibleId, onChange]);

  useEffect(() => {
    setHasLiked(null);
    checkLike();

    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
    };
  }, [checkLike]);

  const toggleLike = async () => {
    if (!cibleId || loading || hasLiked === null) return;

    const prev = hasLiked;
    const next = !prev;

    // ✅ Optimistic UI
    setHasLiked(next);
    onChange?.(next);
    setLoading(true);

    // ✅ UX feedback immédiat
    if (next) {
      openToast("💖 Profil liké !", "Envoyez-lui un message maintenant 😉", "success");
      triggerBurst();
    } else {
      openToast("💔 Like retiré", "", "neutral");
    }

    try {
      const res = await fetch("/api/likes", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cibleId: Number(cibleId) }),
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        // rollback
        setHasLiked(prev);
        onChange?.(prev);
        openToast("⚠️ Oups…", "Impossible d’enregistrer, réessayez.", "error");
      }
    } catch (err) {
      console.error("Erreur toggleLike", err);
      setHasLiked(prev);
      onChange?.(prev);
      openToast("⚠️ Erreur réseau", "Vérifiez votre connexion.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleLike();
  };

  const liked = hasLiked === true;

  return (
    <div className="like-wrap">
      <button
        onClick={handleClick}
        disabled={loading || hasLiked === null}
        className="btn-like"
        aria-busy={loading ? "true" : "false"}
        aria-pressed={liked ? "true" : "false"}
      >
        {/* ✅ Burst FX (autour du bouton) */}
        <div className={`like-burst ${burstOn ? "show" : ""}`} aria-hidden="true">
          <span className="p p1" />
          <span className="p p2" />
          <span className="p p3" />
          <span className="p p4" />
          <span className="p p5" />
          <span className="p p6" />
          <span className="p p7" />
          <span className="p p8" />
        </div>

        <svg
          viewBox="0 0 24 24"
          className={`btn-like-icon ${liked ? "liked pop" : ""}`}
          width="46"
          height="46"
        >
          <path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
               2 6 4 4 6.5 4
               8.04 4 9.54 4.81 10.4 6.09
               11.26 4.81 12.76 4 14.3 4
               16.8 4 18.8 6 18.8 8.5
               18.8 12.28 15.4 15.36 10.25 19.99L12 21.35z"
          />
        </svg>
      </button>

      {showLabel && (
        <div className={`like-label ${liked ? "liked" : "not-liked"}`}>
          {liked ? "" : ""}
        </div>
      )}

      {/* ✅ Toast overlay centré */}
      <div className={`like-toast-overlay ${toast.open ? "open" : ""}`} aria-live="polite">
        <div className={`like-toast-card ${toast.type}`}>
          <div className="like-toast-title">{toast.text}</div>
          {toast.sub ? <div className="like-toast-sub">{toast.sub}</div> : null}
        </div>
      </div>
    </div>
  );
}