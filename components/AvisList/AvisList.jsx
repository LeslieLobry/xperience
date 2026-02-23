"use client";

import AvisCard from "../AvisCard/AvisCard";
import { useCallback, useEffect, useState } from "react";
import "./AvisList.css";

export default function AvisList({ cibleId, connectedUserId, refreshKey = 0 }) {
  const [avisRecus, setAvisRecus] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAvis = useCallback(async () => {
    if (!cibleId) return;

    setError(null);
    setLoading(true);

    try {
      // ✅ no-store: évite que Next/Browser te serve une réponse cachée
      const res = await fetch(`/api/avis/utilisateur/${cibleId}?type=recus`, {
        method: "GET",
        cache: "no-store",
        headers: { "X-Platform": "web" },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || `Erreur HTTP ${res.status}`);
      }

      // ✅ Ton API peut renvoyer "items" (nouveau) ou "avis" (ancien)
      const list = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.avis)
        ? data.avis
        : [];

      setAvisRecus(list);
    } catch (err) {
      console.error("Erreur lors du fetch des avis :", err);
      setError("Impossible de récupérer les avis.");
      setAvisRecus([]);
    } finally {
      setLoading(false);
    }
  }, [cibleId]);

  useEffect(() => {
    fetchAvis();
  }, [fetchAvis, refreshKey]); // ✅ refreshKey force le reload après POST

  if (loading) {
    return <p className="avis-text-p">Chargement des avis...</p>;
  }

  if (error) {
    return <p className="avis-text-p erreur">{error}</p>;
  }

  if (!avisRecus || avisRecus.length === 0) {
    return <p className="avis-text-p">Aucun avis reçu pour l'instant.</p>;
  }

  return (
    <div className="avis-list">
      <h3>Ils parlent de moi</h3>

   {avisRecus.map((avis) => (
  <AvisCard
    key={avis.id}
    avis={avis}
    connectedUserId={connectedUserId}
    cibleId={cibleId}          // ✅ AJOUT ICI
    onRefresh={fetchAvis}
  />
))}

    </div>
  );
}
