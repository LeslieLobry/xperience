"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import FiltreEvenements from "../../components/FiltreEvenements/FiltreEvenements";
import { useRouter } from "next/navigation";
import "./evenements.css"

// --- Composant pour gérer les images S3 privées ou publiques ---
function PresignedImage({ s3Key, alt, ...props }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const safeJson = async (res) => {
      const text = await res.text();
      try {
        return text ? JSON.parse(text) : null;
      } catch {
        return null;
      }
    };

    const run = async () => {
      if (!s3Key) {
        if (!cancelled) setUrl("/placeholder.jpg");
        return;
      }
      if (typeof s3Key === "string" && s3Key.startsWith("http")) {
        if (!cancelled) setUrl(s3Key);
        return;
      }

      try {
        const res = await fetch("/api/photos/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ key: s3Key }),
        });

        const data = await safeJson(res);
        if (!res.ok) {
          if (!cancelled) setUrl("/placeholder.jpg");
          return;
        }

        if (!cancelled) setUrl(data?.url || "/placeholder.jpg");
      } catch {
        if (!cancelled) setUrl("/placeholder.jpg");
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [s3Key]);

  if (!url) {
    return (
      <div
        style={{
          width: 300,
          height: 180,
          background: "#eee",
          borderRadius: 8,
        }}
      />
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      width={300}
      height={180}
      className="event-image"
      style={{ objectFit: "cover", borderRadius: 8, ...(props.style || {}) }}
      {...props}
    />
  );
}

export default function EvenementsPage() {
  const [evenements, setEvenements] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filtres, setFiltres] = useState(null);

  const router = useRouter();
  const { user, authReady } = useAuth();

  // ✅ Redirige seulement quand on sait vraiment si on est connecté
  useEffect(() => {
    if (!authReady) return;
    if (!user) router.replace("/connexion");
  }, [authReady, user, router]);

  useEffect(() => {
    setIsAdmin(user?.role === "ADMIN");
  }, [user]);

  useEffect(() => {
    setPage(1);
  }, [filtres]);

  useEffect(() => {
    if (!authReady || !user) return;

    const controller = new AbortController();

    const safeJson = async (res) => {
      const text = await res.text();
      try {
        return text ? JSON.parse(text) : null;
      } catch {
        return null;
      }
    };

    const fetchEvents = async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));

      if (filtres) {
        if (filtres.lieu) params.set("lieu", filtres.lieu);

        if (filtres.rayon !== undefined && filtres.rayon !== null && filtres.rayon !== "")
          params.set("rayon", String(filtres.rayon));

        if (filtres.dateDebut) params.set("dateDebut", filtres.dateDebut);
        if (filtres.dateFin) params.set("dateFin", filtres.dateFin);

        if (Array.isArray(filtres.acces) && filtres.acces.length)
          params.set("acces", filtres.acces.join(","));

        if (filtres.latitude !== undefined && filtres.latitude !== null && filtres.latitude !== "")
          params.set("latitude", String(filtres.latitude));
        if (filtres.longitude !== undefined && filtres.longitude !== null && filtres.longitude !== "")
          params.set("longitude", String(filtres.longitude));
      }

      try {
        const res = await fetch(`/api/evenements?${params.toString()}`, {
          credentials: "include",
          signal: controller.signal,
        });

        const data = await safeJson(res);

        if (!res.ok) {
          console.error("Erreur /api/evenements:", res.status, data);
          setEvenements([]);
          setTotalPages(1);
          return;
        }

        const events = data?.events || [];
        const total = Number(data?.total) || 0;
        const perPage = Number(data?.perPage) || 10;

        setEvenements(events);

        const tp = Math.max(1, Math.ceil(total / perPage)); // ✅ jamais 0
        setTotalPages(tp);

        if (page > tp) setPage(tp);
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error("Erreur de chargement des événements :", err);
        setEvenements([]);
        setTotalPages(1);
      }
    };

    fetchEvents();
    return () => controller.abort();
  }, [filtres, page, authReady, user]);

  // ✅ Option : évite le flash si tu veux
  if (!authReady) return null;

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
                <Link
                  key={event.id}
                  href={`/evenements/${event.id}`}
                  className="event-link"
                >
                  <div className="event-card">
                    <PresignedImage s3Key={event.imageUrl} alt={event.titre} />

                    <div className="event-info">
                      <h3 className="event-info-title">{event.titre}</h3>
                      <p>
                        {Array.isArray(event.dates)
                          ? event.dates
                              .map((d) =>
                                new Date(d).toLocaleDateString("fr-FR")
                              )
                              .join(", ")
                          : "?"}
                      </p>
                      <p>{event.lieu}</p>
                      <p>{event.participants?.length || 0} participant(s)</p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <p>
                Le calme avant les Xperiences les plus intenses... Patientez, le
                désir monte.
              </p>
            )}
          </div>

          <div className="pagination">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
            >
              Précédent
            </button>

            <span>
              Page {page} / {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
            >
              Suivant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
