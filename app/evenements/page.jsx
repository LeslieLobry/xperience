"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../../context/AuthContext";
import FiltreEvenements from "../../components/FiltreEvenements/FiltreEvenements";
import "../evenements/evenements.css";
import { useRouter } from "next/navigation";

export default function EvenementsPage() {
  const [evenements, setEvenements] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filtres, setFiltres] = useState(null);
  const router = useRouter();
  const { user } = useAuth();

  // Redirige si pas connecté
  useEffect(() => {
    if (user === undefined) return;
    if (!user) router.push("/connexion");
  }, [user, router]);

  // Gère l'admin
  useEffect(() => {
    setIsAdmin(user?.role === "ADMIN");
  }, [user]);

  // Recherche filtrée par API (inclut le rayon, la ville, l'accès, les dates, etc.)
  useEffect(() => {
    // Recharge aussi à chaque changement de page
    const fetchEvents = async () => {
      const params = new URLSearchParams();
      params.append("page", page);

      if (filtres) {
        if (filtres.lieu) params.append("lieu", filtres.lieu);
        if (filtres.rayon) params.append("rayon", filtres.rayon);
        if (filtres.dateDebut) params.append("dateDebut", filtres.dateDebut);
        if (filtres.dateFin) params.append("dateFin", filtres.dateFin);
        if (filtres.acces && filtres.acces.length)
          params.append("acces", filtres.acces.join(","));
        if (filtres.latitude) params.append("latitude", filtres.latitude);
        if (filtres.longitude) params.append("longitude", filtres.longitude);
        // Ajoute d'autres filtres ici si besoin (motCle, etc.)
      }

      try {
        const res = await fetch(`/api/evenements?${params.toString()}`);
        const data = await res.json();
        setEvenements(data.events || []);
        setTotalPages(Math.ceil((data.total || 0) / (data.perPage || 10)));
      } catch (err) {
        console.error("Erreur de chargement des événements :", err);
        setEvenements([]);
        setTotalPages(1);
      }
    };
    fetchEvents();
  }, [filtres, page]);

  // Remise à zéro de la page si on change de filtre
  useEffect(() => {
    setPage(1);
  }, [filtres]);

  return (
    <div className="evenements-container">
      <h1 className="evenements-title">Événements</h1>
      <div className="grid-evenements">
        <FiltreEvenements onFilterChange={setFiltres} />
        <div className="evenements-list">
          <div className="evenements-header">
            {isAdmin && (
              <Link href="/evenements/creer" className="btn-create">
                Créer un événement
              </Link>
            )}
          </div>

          <div className="evenements-grid">
            {evenements?.length > 0 ? (
              evenements.map((event) => (
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
                      <h3 className="event-info-title">{event.titre}</h3>
                      <p>{new Date(event.date).toISOString().split("T")[0]}</p>
                      <p>{event.lieu}</p>
                      <p>{event.participants?.length || 0} participant(s)</p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <p>Aucun événement trouvé.</p>
            )}
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
    </div>
  );
}
