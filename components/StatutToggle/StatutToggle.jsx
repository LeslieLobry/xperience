"use client";

import { useState } from "react";
import "./StatutToggle.css";

export default function StatutToggle({ statut, statutAuto, editable = false, onUpdate }) {
  const [etat, setEtat] = useState(statut);        // "en_ligne" ou "hors_ligne"
  const [auto, setAuto] = useState(statutAuto);    // true ou false

  const toggleStatut = async () => {
    if (!editable) return;

    const nouveauStatut = etat === "en_ligne" ? "hors_ligne" : "en_ligne";

    const res = await fetch("/api/utilisateur/statut", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statut: nouveauStatut,
        statutAuto: false, // ➤ désactive l'automatisme
      }),
    });

    if (res.ok) {
      setEtat(nouveauStatut);
      setAuto(false);
      if (onUpdate) onUpdate({ statut: nouveauStatut, statutAuto: false });
    }
  };

  const resetAuto = async () => {
    const res = await fetch("/api/utilisateur/statut", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statut: "en_ligne",
        statutAuto: true,
      }),
    });

    if (res.ok) {
      setEtat("en_ligne");
      setAuto(true);
      if (onUpdate) onUpdate({ statut: "en_ligne", statutAuto: true });
    }
  };

  return (
    <div className="statut-switch-container">
      <span className="statut-label">
        {auto
          ? etat === "en_ligne"
            ? "🟢 En ligne"
            : "⚫ Hors ligne"
          : etat === "en_ligne"
          ? "🟢 En ligne"
          : "⚫ Hors ligne"}
      </span>

      {editable && (
        <>
          <label className="statut-switch">
            <input
              type="checkbox"
              checked={etat === "en_ligne"}
              onChange={toggleStatut}
            />
            <span className="slider"></span>
          </label>

          {!auto && (
            <button onClick={resetAuto} className="btn-auto">
              🔁 Revenir en auto
            </button>
          )}
        </>
      )}
    </div>
  );
}
