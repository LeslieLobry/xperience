"use client";

import { useState } from "react";
import "./StatutToggle.css";

export default function StatutToggle({ initialStatut, editable = false }) {
  const [statut, setStatut] = useState(initialStatut);

  const toggleStatut = async () => {
    if (!editable) return;

    const newStatut = statut === "en_ligne" ? "hors_ligne" : "en_ligne";
    const res = await fetch("/api/utilisateur/statut", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: newStatut }),
    });

    if (res.ok) {
      const data = await res.json();
      setStatut(data.statut);
    }
  };

  return (
    <button
      className={`statut-button ${statut} ${editable ? "" : "disabled"}`}
      onClick={toggleStatut}
      title={editable ? "Changer le statut" : "Statut visible uniquement"}
    >
      {statut === "en_ligne" ? "🟢 En ligne" : "⚫ Hors ligne"}
    </button>
  );
}
