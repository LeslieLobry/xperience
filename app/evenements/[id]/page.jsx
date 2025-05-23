"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";

export default function PageEvenement() {
  const { id } = useParams();
  const [evenement, setEvenement] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchEvenement = async () => {
      try {
        const res = await fetch(`/api/evenements/${id}`);
        if (!res.ok) throw new Error("Erreur lors de la récupération");
        const data = await res.json();
        setEvenement(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchEvenement();
  }, [id]);

  if (loading) return <div>Chargement...</div>;
  if (!evenement) return <div>Événement introuvable.</div>;

  const dejaInscrit = evenement.participants?.some((p) => p.id === user?.id);

  const participer = async () => {
    const res = await fetch(`/api/evenements/${id}/participer`, {
      method: "POST",
    });

    if (res.ok) {
      setEvenement((prev) => ({
        ...prev,
        participants: [...prev.participants, { id: user.id, pseudo: user.pseudo }],
      }));
    }
  };

  return (
    <div className="evenement-container">
      <h1>{evenement.titre}</h1>

      {evenement.imageUrl && (
        <img src={evenement.imageUrl} alt="Affiche de l'événement" />
      )}

      <p><strong>Date :</strong> {new Date(evenement.date).toISOString().split("T")[0]}</p>
      <p><strong>Heure :</strong> {evenement.heureDebut} - {evenement.heureFin}</p>
      <p><strong>Lieu :</strong> {evenement.lieu}</p>
      <p><strong>Type :</strong> {evenement.type}</p>
      <p><strong>Accès :</strong> {evenement.acces}</p>

      <h2>Description</h2>
      <p>{evenement.description}</p>

      <h2>Tarifs</h2>
      <ul>
        <li>Couples : {evenement.tarifCouple ?? "?"} €</li>
        <li>Femmes : {evenement.tarifFemme ?? "?"} €</li>
        <li>Hommes : {evenement.tarifHomme ?? "?"} €</li>
      </ul>

      <h2>Participants ({evenement.participants?.length || 0})</h2>
      <ul>
        {evenement.participants?.map((p) => (
          <li key={p.id}>{p.pseudo}</li>
        ))}
      </ul>

      {user && (
        <button onClick={participer} disabled={dejaInscrit}>
          {dejaInscrit ? "Déjà inscrit" : "Participer"}
        </button>
      )}
    </div>
  );
}
