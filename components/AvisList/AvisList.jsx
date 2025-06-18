"use client";

import AvisCard from "../AvisCard/AvisCard";
import { useState, useEffect } from "react";
import "./AvisList.css"

export default function AvisList({ cibleId, connectedUserId }) {
  const [avisRecus, setAvisRecus] = useState([]);

  const fetchAvis = async () => {
    const res = await fetch(`/api/avis/utilisateur/${cibleId}`);
    const data = await res.json();
    if (res.ok && data.avis) {
      setAvisRecus(data.avis);
    }
  };

  useEffect(() => {
    fetchAvis();
  }, [cibleId]);

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
