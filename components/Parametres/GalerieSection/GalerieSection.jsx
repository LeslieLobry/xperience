'use client';
import { useEffect, useState } from "react";

export default function GalerieSection({ utilisateurId }) {
  const [accesList, setAccesList] = useState([]);

  useEffect(() => {
    fetch(`/api/utilisateur/${utilisateurId}/galerie-privee/acces`)
      .then(res => res.json())
      .then(setAccesList);
  }, [utilisateurId]);

  const retirerAcces = async (demandeId) => {
    await fetch(`/api/demandes-acces/${demandeId}/supprimer`, {
      method: "DELETE",
    });
    setAccesList(prev => prev.filter(d => d.id !== demandeId));
  };

  return (
    <div>
      <h2>Utilisateurs ayant accès à votre galerie privée</h2>
      {accesList.length === 0 ? (
        <p>Aucun accès accordé pour le moment.</p>
      ) : (
        <ul>
          {accesList.map((d) => (
            <li key={d.id}>
              <img src={d.demandeur.photoUrl || "/images/default-avatar.png"} width="40" />
              <span>{d.demandeur.pseudo}</span>
              <button onClick={() => retirerAcces(d.id)}>Retirer l'accès</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
