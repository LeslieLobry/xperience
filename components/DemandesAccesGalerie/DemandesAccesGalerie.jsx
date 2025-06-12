'use client';
import { useEffect, useState } from "react";

export default function DemandesAccesGalerie() {
  const [demandes, setDemandes] = useState([]);

  useEffect(() => {
    fetch("/api/galerie-privee/demandes")
      .then(res => res.json())
      .then(setDemandes);
  }, []);

  const handleAction = async (id, action) => {
    await fetch(`/api/galerie-privee/demandes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: action }),
    });

    setDemandes(prev => prev.filter(d => d.id !== id));
  };

  if (demandes.length === 0) return <p>Aucune demande en attente.</p>;

  return (
    <div>
      <h2>Demandes d'accès à votre galerie privée</h2>
      <ul>
        {demandes.map(d => (
          <li key={d.id}>
            <img src={d.demandeur.photoUrl || "/images/default-avatar.png"} width="50" />
            <span>{d.demandeur.pseudo}</span>
            <button onClick={() => handleAction(d.id, "ACCEPTEE")}>Accepter</button>
            <button onClick={() => handleAction(d.id, "REFUSEE")}>Refuser</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
