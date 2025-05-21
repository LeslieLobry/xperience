"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../../context/AuthContext";

export default function EvenementsPage() {
  const [evenements, setEvenements] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === "ADMIN") setIsAdmin(true);
  }, [user]);

  useEffect(() => {
    const fetchEvents = async () => {
      const res = await fetch(`/api/events?page=${page}`);
      const data = await res.json();
      setEvenements(data.events);
      setTotalPages(Math.ceil(data.total / data.perPage));
    };
    fetchEvents();
  }, [page]);
console.log("ROLE:", user?.role);

  return (
    <div className="evenements-container" style={{ padding: "2rem" }}>
      <div className="evenements-header" style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Événements</h1>
        {isAdmin && (
          <Link href="/evenements/creer" className="btn-create">
            Créer un événement
          </Link>
        )}
      </div>

      <div className="evenements-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
        {evenements.map((event) => (
          <div key={event.id} className="event-card" style={{ background: "#fff", padding: "1rem", borderRadius: "8px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }}>
            <Image
  src={
    event.imageUrl?.startsWith("/")
      ? event.imageUrl
      : "/placeholder.jpg"
  }
  alt={event.titre}
  width={300}
  height={180}
  style={{ borderRadius: "4px", objectFit: "cover" }}
/>

            <div className="event-info" style={{ marginTop: "1rem" }}>
              <h3>{event.titre}</h3>
              <p>{new Date(event.date).toLocaleDateString()}</p>
              <p>{event.lieu}</p>
              <p>{event.participants} participant(s)</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination simple */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: "2rem", gap: "1rem" }}>
        <button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}>
          Précédent
        </button>
        <span>Page {page} / {totalPages}</span>
        <button onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages}>
          Suivant
        </button>
      </div>
    </div>
  );
}
