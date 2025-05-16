"use client";

import AvisCard from "../AvisCard/AvisCard";
import { useState, useEffect } from "react";

export default function AvisList({ avisRecus: initialAvisRecus, connectedUserId }) {
  const [avisRecus, setAvisRecus] = useState(initialAvisRecus || []);

  const refreshAvis = async () => {
    const res = await fetch("/api/avis/moi"); // 👈 à adapter selon ta route
    const data = await res.json();
    if (res.ok && data.avis) {
      setAvisRecus(data.avis);
    }
  };

  if (!avisRecus || avisRecus.length === 0) {
    return <p>Aucun avis reçu pour l'instant.</p>;
  }

  return (
    <div className="avis-list">
      <h2>Avis reçus</h2>
      {avisRecus.map((avis) => (
        <AvisCard
          key={avis.id}
          avis={avis}
          connectedUserId={connectedUserId}
          onRefresh={refreshAvis}
        />
      ))}
    </div>
  );
}
