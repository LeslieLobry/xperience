"use client";

import { useEffect, useState, useCallback } from "react";
import "./BoutonLike.css";

export default function BoutonLike({ cibleId, onChange }) {
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
        setHasLiked(!!data.hasLiked);
      } else {
        console.error("Erreur fetch like status:", res.status);
        setHasLiked(false);
      }
    } catch (err) {
      console.error("Erreur checkLike", err);
      setHasLiked(false);
    }
  }, [cibleId]);

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

        let errorData = null;
        try {
          errorData = await res.json();
        } catch {}
        console.error("Erreur API:", errorData || res.status);
        return;
      }

      onChange?.(next); // optionnel : prévenir le parent
    } catch (err) {
      // ❌ on revert si crash réseau
      setHasLiked(prev);
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
    <button
      onClick={handleClick}
      disabled={loading || hasLiked === null}
      className="btn-like"
      aria-busy={loading ? "true" : "false"}
    >
      <div className="tooltip-container">
        <img
          key={liked ? "liked" : "unliked"} // force un refresh DOM de l'image si besoin
          src={liked ? "/images/coeurnon.svg" : "/images/coeur.svg"}
          alt={liked ? "Je n'aime plus" : "J'aime"}
          className="btn-like-icon"
          style={{ width: "46px", height: "46px", opacity: loading ? 0.6 : 1 }}
        />
        <span className="tooltip">{liked ? "Je n'aime plus" : "J'aime"}</span>
      </div>
    </button>
  );
}
