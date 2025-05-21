"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";


export default function AdminEvenementsPage() {
  const [evenements, setEvenements] = useState([]);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user || user.role !== "ADMIN") {
      router.push("/evenements");
    }
  }, [user]);

  useEffect(() => {
    const fetchEvents = async () => {
      const res = await fetch("/api/events");
      const data = await res.json();
      setEvenements(data.events);
    };
    fetchEvents();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Voulez-vous vraiment supprimer cet événement ?")) return;
    const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEvenements(evenements.filter(e => e.id !== id));
    } else {
      setError("Erreur lors de la suppression.");
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Gestion des événements</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #ccc" }}>
            <th style={{ textAlign: "left", padding: "8px" }}>Titre</th>
            <th>Date</th>
            <th>Lieu</th>
            <th>Type</th>
            <th>Accès</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {evenements.map((event) => (
            <tr key={event.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "8px" }}>{event.titre}</td>
              <td>{new Date(event.date).toLocaleDateString()}</td>
              <td>{event.lieu}</td>
              <td>{event.type}</td>
              <td>{event.acces}</td>
              <td>
                <button onClick={() => router.push(`/evenements/modifier/${event.id}`)}>
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(event.id)}
                  style={{ marginLeft: "0.5rem", color: "red" }}
                >
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
