"use client";

import { useEffect, useState } from "react";
import "./BlocagesSection.css";

export default function BlocagesSection() {
  const [blocages, setBlocages] = useState([]);

  useEffect(() => {
    const fetchBlocages = async () => {
      try {
        const res = await fetch("/api/blocage/mes-blocages", { credentials: "include" });
        const data = await res.json();
        if (res.ok) setBlocages(data.blocages);
      } catch (err) {
        console.error("Erreur lors du chargement des blocages :", err);
      }
    };

    fetchBlocages();
  }, []);

  const handleDebloquer = async (bloquéId) => {
    try {
      const res = await fetch("/api/blocage", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bloquéId }),
      });

      if (res.ok) {
        // ✅ mise à jour immédiate de la liste
        setBlocages((prev) => prev.filter((b) => b.bloquéId !== bloquéId));
      } else {
        console.error("Erreur lors du déblocage.");
      }
    } catch (err) {
      console.error("Erreur serveur :", err);
    }
  };

  return (
    <div className="blocages-section">
      <h2 style={{ color: "red" }}>Blocages de personnes indésirables</h2>
      <p>Qui ai-je bloqué ?</p>

      {blocages.length === 0 ? (
        <div className="aucun-blocage">Il n'y a aucun utilisateur bloqué.</div>
      ) : (
        <ul className="liste-blocages">
          {blocages.map(({ bloque, bloquéId }) => (
            <li key={bloquéId} className="blocage-item">
              <img
                src={bloque.photoUrl || "/images/default-avatar.png"}
                alt={bloque.pseudo}
                className="blocage-avatar"
              />
              <div className="blocage-infos">
                <strong>{bloque.pseudo}</strong>
                <p>{bloque.age} ans — {bloque.localisation}</p>
              </div>
              <button className="debloquer-btn" onClick={() => handleDebloquer(bloquéId)}>
                Débloquer
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
