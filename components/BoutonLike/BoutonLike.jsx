"use client";

import { useState, useEffect } from "react";
import "./BoutonLike.css"
export default function BoutonLike({ cibleId }) {
  const [hasLiked, setHasLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkLike = async () => {
      try {
        console.log("Checking like status for cibleId:", cibleId);
        const res = await fetch(`/api/utilisateur/${cibleId}/has-liked`, {
          credentials: "include",  // Pour envoyer les cookies HTTP-only
          cache: "no-store",       // Pour éviter le cache
        });
        console.log("Response status:", res.status);
        if (res.ok) {
          const data = await res.json();
          console.log("Like status received:", data.hasLiked);
          setHasLiked(data.hasLiked);
        } else {
          console.error("Erreur fetch like status:", res.status);
        }
      } catch (err) {
        console.error("Erreur checkLike", err);
      }
    };

    if (cibleId) {
      checkLike();
    }
  }, [cibleId]);

  const toggleLike = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/likes", {
        method: hasLiked ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cibleId: Number(cibleId) }),
        credentials: "include",
      });

      if (res.ok) {
        setHasLiked(!hasLiked);
      } else {
        const errorData = await res.json();
        console.error("Erreur API:", errorData);
      }
    } catch (err) {
      console.error("Erreur toggleLike", err);
    } finally {
      setLoading(false);
    }
  };

  return (
  <button onClick={toggleLike} disabled={loading} className="btn-like">
    <img
      src={hasLiked ? "/images/coeurnon.svg":"/images/coeur.svg"  }
      alt={hasLiked ? "" : ""}
      style={{ width: "46px", height: "46px",}}
    />
    {hasLiked ? "" : ""}
  </button>
);

}
