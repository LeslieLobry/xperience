"use client";

import { useEffect, useState, useCallback } from "react";
import "./BoutonLike.css";

export default function BoutonLike({ cibleId, onChange, showLabel = true }) {
  const [hasLiked, setHasLiked] = useState(null);
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
  }, [checkLike]);

  const toggleLike = async () => {
    if (!cibleId || loading || hasLiked === null) return;

    const prev = hasLiked;
    const next = !prev;

    // ✅ Optimistic UI
    setHasLiked(next);
    onChange?.(next);
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
        setHasLiked(prev);
        onChange?.(prev);
      }
    } catch (err) {
      console.error("Erreur toggleLike", err);
      setHasLiked(prev);
      onChange?.(prev);
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
    </div>
  );
}
