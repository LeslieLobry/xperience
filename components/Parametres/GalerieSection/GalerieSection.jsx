'use client';
import { useEffect, useState } from "react";

export default function GalerieSection({ utilisateurId }) {
  const [accesList, setAccesList] = useState([]);
  const [refusesList, setRefusesList] = useState([]);

  useEffect(() => {
    fetch(`/api/utilisateur/${utilisateurId}/galerie-privee/acces`)
      .then(res => res.json())
      .then(setAccesList);

    fetch(`/api/utilisateur/${utilisateurId}/galerie-privee/refusees`)
      .then(res => res.json())
      .then(setRefusesList);
  }, [utilisateurId]);

  const retirerAcces = async (demandeId) => {
    await fetch(`/api/demandes-acces/${demandeId}/supprimer`, {
      method: "DELETE",
    });
    setAccesList(prev => prev.filter(d => d.id !== demandeId));
  };

  const accorderAcces = async (demandeId) => {
    await fetch(`/api/demandes-acces/${demandeId}/accepter`, {
      method: "PATCH",
    });
    setRefusesList(prev => prev.filter(d => d.id !== demandeId));
    // Optionnel : on peut recharger accesList si besoin
    const res = await fetch(`/api/utilisateur/${utilisateurId}/galerie-privee/acces`);
    const updated = await res.json();
    setAccesList(updated);
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

      <h2 style={{ marginTop: "2rem" }}>Demandes refusées</h2>
      {refusesList.length === 0 ? (
        <p>Aucune demande refusée.</p>
      ) : (
        <ul>
          {refusesList.map((d) => (
            <li key={d.id}>
              <img src={d.demandeur.photoUrl || "/images/default-avatar.png"} width="40" />
              <span>{d.demandeur.pseudo}</span>
              <button onClick={() => accorderAcces(d.id)}>Accorder l'accès</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
