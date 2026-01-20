"use client";

import { useEffect, useState } from "react";
import "./StatutToggle.css";

export default function StatutToggle({ statut, editable = false, onUpdate }) {
  const [etat, setEtat] = useState(statut);

  useEffect(() => {
    setEtat(statut);
  }, [statut]);

  const toggleInvisible = async () => {
    if (!editable) return;

    const nouveauStatut = etat === "hors_ligne" ? "en_ligne" : "hors_ligne";

    try {
      const res = await fetch("/api/utilisateur/statut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ statut: nouveauStatut }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setEtat(nouveauStatut);
        onUpdate?.({ statut: nouveauStatut });
      } else {
        alert(data?.error || "Erreur lors du changement de statut");
      }
    } catch (err) {
      alert("Impossible de changer le statut (réseau).");
      console.error(err);
    }
  };

  const invisible = etat === "hors_ligne";

  return (
    <div className="statut-switch-container">
      <span className={`statut-label ${invisible ? "is-invisible" : "is-visible"}`}>
        {invisible ? "Mode invisible" : "Visible"}
      </span>

      {editable && (
        <label className="statut-switch">
          <input
            type="checkbox"
            checked={!invisible}
            onChange={toggleInvisible}
          />
          <span className="slider"></span>
        </label>
      )}
    </div>
  );
}
