"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../../context/AuthContext";
import FiltreEvenements from "../../components/FiltreEvenements/FiltreEvenements";

export default function EvenementsPage() {
  const [evenements, setEvenements] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filtres, setFiltres] = useState(null);

  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === "ADMIN") setIsAdmin(true);
  }, [user]);

  useEffect(() => {
    const fetchEvents = async () => {
      const res = await fetch(`/api/evenements?page=${page}`);
      const data = await res.json();
      setEvenements(data.events);
      setFiltered(data.events);
      setTotalPages(Math.ceil(data.total / data.perPage));
    };
    fetchEvents();
  }, [page]);

  useEffect(() => {
    if (!filtres) return;

    const term = filtres.motCle?.toLowerCase() || "";

    const resultats = evenements.filter((event) => {
      const matchLieu = event.lieu.toLowerCase().includes(filtres.lieu.toLowerCase());
      const matchMotCle =
        event.titre.toLowerCase().includes(term) ||
        event.description.toLowerCase().includes(term);
      const matchDate =
        (!filtres.dateDebut || new Date(event.date) >= new Date(filtres.dateDebut)) &&
        (!filtres.dateFin || new Date(event.date) <= new Date(filtres.dateFin));
      const matchAcces = filtres.acces.length === 0 || filtres.acces.includes(event.acces);

      return matchLieu && matchMotCle && matchDate && matchAcces;
    });

    setFiltered(resultats);
  }, [filtres, evenements]);

  return (
    <div className="evenements-container">
      <FiltreEvenements onFilterChange={setFiltres} />

      <div className="evenements-list">
        <div className="evenements-header">
          <h1>Événements</h1>
          {isAdmin && (
            <Link href="/evenements/creer" className="btn-create">
              Créer un événement
            </Link>
          )}
        </div>

        <div className="evenements-grid">
          {filtered.map((event) => (
            <Link key={event.id} href={`/evenements/${event.id}`} className="event-link">
              <div className="event-card">
                <Image
                  src={event.imageUrl?.startsWith("/") ? event.imageUrl : "/placeholder.jpg"}
                  alt={event.titre}
                  width={300}
                  height={180}
                  className="event-image"
                />
                <div className="event-info">
                  <h3>{event.titre}</h3>
                  <p>{new Date(event.date).toISOString().split("T")[0]}</p>
                  <p>{event.lieu}</p>
                  <p>{event.participants} participant(s)</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="pagination">
          <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1}>
            Précédent
          </button>
          <span>
            Page {page} / {totalPages}
          </span>
          <button onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages}>
            Suivant
          </button>
        </div>
      </div>
    </div>
  );
}
