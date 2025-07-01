"use client";

import AvisCard from "../AvisCard/AvisCard";
import { useState, useEffect } from "react";
import "./AvisList.css";

export default function AvisList({ cibleId, connectedUserId }) {
  const [avisRecus, setAvisRecus] = useState([]);
  const [error, setError] = useState(null);

  const fetchAvis = async () => {
    setError(null);
    try {
      const res = await fetch(`/api/avis/utilisateur/${cibleId}`);
      if (!res.ok) {
        throw new Error(`Erreur HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.avis) {
        setAvisRecus(data.avis);
      } else {
        setAvisRecus([]);
      }
    } catch (err) {
      console.error("Erreur lors du fetch des avis :", err);
      setError("Impossible de récupérer les avis.");
      setAvisRecus([]);
    }
  };

  useEffect(() => {
    if (cibleId) {
      fetchAvis();
    }
  }, [cibleId]);

  if (error) {
    return <p className="avis-text-p erreur">{error}</p>;
  }

  if (!avisRecus || avisRecus.length === 0) {
    return <p className="avis-text-p">Aucun avis reçu pour l'instant.</p>;
  }

  return (
    <div className="avis-list">
      <h2>Avis reçus</h2>
      {avisRecus.map((avis) => (
        <AvisCard
          key={avis.id}
          avis={avis}
          connectedUserId={connectedUserId}
          onRefresh={fetchAvis}
        />
      ))}
    </div>
  );
}
