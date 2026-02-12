"use client";

import { useEffect, useState, useCallback } from "react";
import "./BoutonLike.css";

export default function BoutonLike({ cibleId, onChange, showLabel = true }) {
  const [hasLiked, setHasLiked] = useState(null); // null = on ne sait pas encore
  const [loading, setLoading] = useState(false);

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
        onChange?.(value); // ✅ sync parent dès le chargement
      } else {
        console.error("Erreur fetch like status:", res.status);
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
  }, [checkLike]);

  const toggleLike = async () => {
    if (!cibleId || loading || hasLiked === null) return;

    const prev = hasLiked;
    const next = !prev;

    // ✅ Optimistic UI : on update tout de suite
    setHasLiked(next);
    onChange?.(next); // ✅ parent instantané
    setLoading(true);

    try {
      const res = await fetch("/api/likes", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cibleId: Number(cibleId) }),
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        // ❌ on revert si erreur API
        setHasLiked(prev);
        onChange?.(prev);

        let errorData = null;
        try {
          errorData = await res.json();
        } catch {}
        console.error("Erreur API:", errorData || res.status);
        return;
      }
    } catch (err) {
      // ❌ on revert si crash réseau
      setHasLiked(prev);
      onChange?.(prev);
      console.error("Erreur toggleLike", err);
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
        <div className="tooltip-container">
          <img
            key={liked ? "liked" : "unliked"}
            src={liked ? "/images/coeur.svg" : "/images/coeurnon.svg"}
            alt={liked ? "J’aime" : "J’aime pas"}
            className="btn-like-icon"
            style={{ width: "46px", height: "46px", opacity: loading ? 0.6 : 1 }}
          />
          <span className="tooltip">{liked ? "J’aime" : "J’aime pas"}</span>
        </div>
      </button>

      {showLabel && (
        <div className={`like-label ${liked ? "liked" : "not-liked"}`}>
          {liked ? "J’aime" : "J’aime pas"}
        </div>
      )}
    </div>
  );
}
