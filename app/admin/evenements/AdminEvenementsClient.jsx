"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "./admin-evenements.css";

export default function AdminEvenementsClient() {
  const [evenements, setEvenements] = useState([]);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
 const fetchEvents = async () => {
  try {
    const res = await fetch("/api/evenements");
    console.log("🧪 Réponse fetch :", res);

    const data = await res.json();
    console.log("📦 Données reçues :", data);

    setEvenements(data.events || []);
  } catch (err) {
    console.error("Erreur chargement événements :", err);
    setError("Erreur serveur.");
  }
};

    fetchEvents();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Voulez-vous vraiment supprimer cet événement ?")) return;
    const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEvenements(evenements.filter((e) => e.id !== id));
    } else {
      setError("Erreur lors de la suppression.");
    }
  };

  return (
    <div className="admin-evenements-container">
      <h1>Gestion des événements</h1>
      {error && <p className="admin-evenements-error">{error}</p>}

      <table className="admin-evenements-table">
        <thead>
          <tr>
            <th>Titre</th>
            <th>Date</th>
            <th>Lieu</th>
            <th>Type</th>
            <th>Accès</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {evenements.map((event) => (
            <tr key={event.id}>
              <td>{event.titre}</td>
              <td>{new Date(event.date).toLocaleDateString()}</td>
              <td>{event.lieu}</td>
              <td>{event.type}</td>
              <td>{event.acces}</td>
              <td>
                <button onClick={() => router.push(`/evenements/modifier/${event.id}`)}>
                  Modifier
                </button>
                <button className="supprimer-btn" onClick={() => handleDelete(event.id)}>
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
