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
    <div className="statut-switch-container">
      <span className="statut-label">
        {statut === "en_ligne" ? "🟢 En ligne" : "⚫ Hors ligne"}
      </span>
      <label className={`statut-switch ${editable ? "" : "disabled"}`}>
        <input
          type="checkbox"
          checked={statut === "en_ligne"}
          onChange={toggleStatut}
          disabled={!editable}
        />
        <span className="slider"></span>
      </label>
    </div>
  );
}
