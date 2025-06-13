"use client";
import { useEffect, useState } from "react";

export default function AccesGalerieList({ userId }) {
  const [accesList, setAccesList] = useState([]);

  useEffect(() => {
    fetch(`/api/utilisateur/${userId}/galerie-privee/acces`)
      .then(res => res.json())
      .then(setAccesList);
  }, [userId]);

  const handleRevoke = async (id) => {
    await fetch(`/api/demandes-acces/${id}/revoquer`, { method: "PATCH" });
    setAccesList(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div>
      <h3>Accès à ma galerie privée</h3>
      <ul>
        {accesList.map(a => (
          <li key={a.id}>
            <img src={a.demandeur.photoUrl || "/images/default-avatar.png"} width="40" />
            <span>{a.demandeur.pseudo}</span>
            <button onClick={() => handleRevoke(a.id)}>Supprimer l'accès</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
