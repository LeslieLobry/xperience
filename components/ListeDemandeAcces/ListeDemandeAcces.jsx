"use client";

import React, { useEffect, useState } from "react";

export default function ListeDemandesAcces() {
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDemandes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/demandes-acces");
      if (!res.ok) throw new Error("Erreur lors de la récupération");
      const data = await res.json();
      setDemandes(data);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDemandes();
  }, []);

  const handleUpdate = async (id, statut) => {
    try {
      const res = await fetch(`/api/demandes-acces/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut }),
      });
      if (!res.ok) throw new Error("Erreur lors de la mise à jour");
      // Retirer la demande traitée de la liste
      setDemandes(demandes.filter(d => d.id !== id));
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return <p>Chargement des demandes...</p>;
  if (error) return <p>Erreur : {error}</p>;
  if (demandes.length === 0) return <p>Aucune demande en attente.</p>;

  return (
    <div>
      <h3>Demandes d'accès en attente</h3>
      <ul>
        {demandes.map(demande => (
          <li key={demande.id} style={{ marginBottom: 10 }}>
            <b>{demande.demandeur.pseudo}</b> souhaite accéder à la galerie "<i>{demande.galeriePrivee.nom}</i>"<br />
            <button onClick={() => handleUpdate(demande.id, "ACCEPTEE")}>Accepter</button>{" "}
            <button onClick={() => handleUpdate(demande.id, "REFUSEE")}>Refuser</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
