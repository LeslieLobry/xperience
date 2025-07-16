'use client';
import { useEffect, useState } from "react";
import Image from "next/image";

export default function DemandesAccesGalerie() {
  const [demandes, setDemandes] = useState([]);
  const [noGalerie, setNoGalerie] = useState(false);

  useEffect(() => {
    fetch("/api/galerie-privee/demandes")
      .then(res => res.json())
      .then(data => {
        if (data.error === "NO_GALERIE") setNoGalerie(true);
        else setDemandes(data);
      });
  }, []);

  const handleAction = async (id, action) => {
    await fetch(`/api/galerie-privee/demandes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: action }),
    });
    setDemandes(prev => prev.filter(d => d.id !== id));
  };

  if (noGalerie) {
    return (
      <div className="profil-section">
        <h3 className="profil-section-title">Demandes d'accès à votre galerie privée</h3>
        <div style={{ textAlign: "center", padding: "1rem" }}>
          <p style={{ color: "#888", marginTop: "0.5rem" }}>Pas de galerie privée pour le moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profil-section">
      <h3 className="profil-section-title">Demandes d'accès à votre galerie privée</h3>

      {demandes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "1rem" }}>
          <p style={{ color: "#888", marginTop: "0.5rem" }}>Aucune demande en attente pour le moment.</p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {demandes.map(d => (
            <li
              key={d.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "0.5rem 0",
                borderBottom: "1px solid #ccc"
              }}
            >
              <img
                src={d.demandeur.photoUrl || "/images/default-avatar.png"}
                width="50"
                height="50"
                style={{ borderRadius: "50%", objectFit: "cover" }}
                alt={`Avatar de ${d.demandeur.pseudo}`}
              />
              <span style={{ flex: 1 }}>{d.demandeur.pseudo}</span>
              <button onClick={() => handleAction(d.id, "ACCEPTEE")}>Accepter</button>
              <button onClick={() => handleAction(d.id, "REFUSEE")}>Refuser</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
