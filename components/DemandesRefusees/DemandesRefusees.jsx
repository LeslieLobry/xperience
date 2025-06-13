'use client';
import { useEffect, useState } from "react";

export default function DemandesRefusees({ utilisateurId }) {
  const [refuses, setRefuses] = useState([]);

  useEffect(() => {
    fetch(`/api/utilisateur/${utilisateurId}/galerie-privee/refusees`)
      .then(res => res.json())
      .then(setRefuses)
      .catch(err => console.error("Erreur chargement refusés :", err));
  }, [utilisateurId]);

  const accepterDemande = async (demandeId) => {
    try {
      await fetch(`/api/demandes-acces/${demandeId}/accepter`, {
        method: "PATCH",
      });
      setRefuses(prev => prev.filter(d => d.id !== demandeId));
    } catch (err) {
      console.error("Erreur lors de l'acceptation :", err);
    }
  };

  if (refuses.length === 0) return <p>Aucune demande refusée.</p>;

  return (
    <div>
      <h2>Demandes refusées</h2>
      <ul>
        {refuses.map((d) => (
          <li key={d.id}>
            <img
              src={d.demandeur.photoUrl || "/images/default-avatar.png"}
              width="40"
              alt={`Photo de ${d.demandeur.pseudo}`}
            />
            <span>{d.demandeur.pseudo}</span>
            <button onClick={() => accepterDemande(d.id)}>Accorder l'accès</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
