"use client";

import { useEffect, useState } from "react";
import "./StatutToggle.css";

export default function StatutToggle({
  statut,
  statutAuto,
  editable = false,
  onUpdate,
}) {
  const [etat, setEtat] = useState(statut); // "en_ligne" ou "hors_ligne"
  const [auto, setAuto] = useState(statutAuto); // true ou false

  // ✅ IMPORTANT : resync si le parent met à jour statut/statutAuto (ex: refresh /api/me)
  useEffect(() => {
    setEtat(statut);
  }, [statut]);

  useEffect(() => {
    setAuto(statutAuto);
  }, [statutAuto]);

  const toggleStatut = async () => {
    if (!editable) return;
    const nouveauStatut = etat === "en_ligne" ? "hors_ligne" : "en_ligne";
    try {
      const res = await fetch("/api/utilisateur/statut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ✅ important si cookie httpOnly
        body: JSON.stringify({
          statut: nouveauStatut,
          statutAuto: false,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setEtat(nouveauStatut);
        setAuto(false);
        if (onUpdate) onUpdate({ statut: nouveauStatut, statutAuto: false });
      } else {
        alert(data?.error || "Erreur inattendue lors du changement de statut");
      }
    } catch (err) {
      alert("Impossible de changer le statut. (erreur réseau)");
      console.error(err);
    }
  };

  const resetAuto = async () => {
    try {
      const res = await fetch("/api/utilisateur/statut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ✅ important si cookie httpOnly
        body: JSON.stringify({
          statut: "en_ligne",
          statutAuto: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setEtat("en_ligne");
        setAuto(true);
        if (onUpdate) onUpdate({ statut: "en_ligne", statutAuto: true });
      } else {
        alert(data?.error || "Erreur inattendue lors du retour en auto.");
      }
    } catch (err) {
      alert("Impossible d'activer l'auto-statut. (erreur réseau)");
      console.error(err);
    }
  };

  return (
    <div className="statut-switch-container">
      <span className="statut-label">
        {etat === "en_ligne" ? "🟢 En ligne" : "⚫ Hors ligne"}
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
