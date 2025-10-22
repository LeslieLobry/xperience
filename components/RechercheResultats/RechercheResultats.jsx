"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "../ProfilsDisplay/ProfilsDisplay.css";
import "./RechercheResultats.css";

/* ---------------- Utils sûrs ---------------- */
function formatPseudo(p) {
  if (typeof p !== "string" || p.length === 0) return "Profil";
  const first = p.charAt(0).toUpperCase();
  return first + p.slice(1).toLowerCase();
}
function safeDistance(d) {
  const n = Number(d);
  return Number.isFinite(n) ? n.toFixed(1) : "—";
}

/* ---------------- Hook presign ---------------- */
function usePresignedPhotos(users) {
  const [photoUrls, setPhotoUrls] = useState({});
  useEffect(() => {
    let canceled = false;
    async function fetchAll() {
      try {
        const list = Array.isArray(users) ? users : [];
        const result = {};
        await Promise.all(
          list.map(async (user) => {
            try {
              const key = user?.photoUrl;
              if (!key) {
                result[user?.id ?? Math.random()] = "/default.jpg";
                return;
              }
              if (typeof key === "string" && key.startsWith("http")) {
                result[user.id] = key;
                return;
              }
              const res = await fetch("/api/photos/presign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key }),
              });
              const data = await res.json().catch(() => ({}));
              result[user.id] = data?.url || "/default.jpg";
            } catch {
              result[user?.id ?? Math.random()] = "/default.jpg";
            }
          })
        );
        if (!canceled) setPhotoUrls(result);
      } catch (e) {
        if (!canceled) setPhotoUrls({});
        // log doux
        console.warn("[usePresignedPhotos] erreur:", e);
      }
    }
    if (Array.isArray(users) && users.length) fetchAll();
    else setPhotoUrls({});
    return () => {
      canceled = true;
    };
    // stringify pour déclencher quand la liste change réellement
  }, [JSON.stringify(users)]);
  return photoUrls;
}

export default function RechercheResultats({ className = "" }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const photoUrls = usePresignedPhotos(utilisateurs);

  // ✅ plus robuste que toString() (gère le cas de params vides ou ordre différent)
  const hasParams = useMemo(
    () => Array.from(searchParams?.keys?.() ?? []).length > 0,
    [searchParams]
  );

  useEffect(() => {
    try {
      const params = searchParams?.toString?.() ?? "";
      if (!params) return;
      setLoading(true);
      setHasSearched(true);

      fetch(`/api/recherche?${params}`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          const list = Array.isArray(data?.utilisateurs) ? data.utilisateurs : [];
          setUtilisateurs(list);
          setLoading(false);
        })
        .catch((err) => {
          console.error("[RechercheResultats] fetch erreur:", err);
          setUtilisateurs([]);
          setLoading(false);
        });
    } catch (e) {
      console.error("[RechercheResultats] useEffect erreur:", e);
    }
  }, [searchParams]);

  if (!hasSearched) return null;

  const handleResetSearch = () => router.push("/recherche");
  const handleGoHome = () => router.push("/accueil-page"); // change en "/" si besoin

  // --- Ajouts UI : chips de filtres actifs (non destructif)
  const activeFilters = useMemo(() => {
    try {
      const entries = Array.from(searchParams?.entries?.() ?? []).filter(
        ([k, v]) => v && !["page"].includes(k)
      );
      return entries.slice(0, 12);
    } catch {
      return [];
    }
  }, [searchParams]);

  return (
    <div className={`profil-list1 ${className}`}>
      {/* Barre d’actions (visible même en chargement) */}
      {hasParams && (
        <div
          className="recherche-toolbar"
          role="region"
          aria-label="Actions de recherche"
        >
          <div className="rt-left">
            <button
              className="btn-outlined"
              onClick={handleResetSearch}
              title="Nouvelle recherche"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                aria-hidden="true"
                style={{ marginRight: 6 }}
              >
                <path
                  d="M12 5V2L7 6l5 4V7c3.31 0 6 2.69 6 6a6 6 0 1 1-6-6"
                  fill="currentColor"
                />
              </svg>
              Nouvelle recherche
            </button>

            <span className="rt-divider" aria-hidden="true" />

            <button className="btn-primary" onClick={handleGoHome} title="Accueil">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                aria-hidden="true"
                style={{ marginRight: 6 }}
              >
                <path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z" fill="currentColor" />
              </svg>
              Accueil
            </button>

            <span className="rt-count" aria-live="polite">
              {Array.isArray(utilisateurs) ? utilisateurs.length : 0} résultat
              {Array.isArray(utilisateurs) && utilisateurs.length > 1 ? "s" : ""}
            </span>
          </div>

          {activeFilters.length > 0 && (
            <div className="rt-filters" role="list" aria-label="Filtres actifs">
              {activeFilters.map(([k, v]) => (
                <span className="chip" key={`${k}-${v}`} role="listitem" title={`${k}=${v}`}>
                  <strong>{k}</strong>
                  <span className="chip-sep">:</span>
                  <span className="chip-val">{v}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <h1 className="profil-list1-title">Résultats de recherche</h1>

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <div className="grid-profil-search">
          {!Array.isArray(utilisateurs) || utilisateurs.length === 0 ? (
            <p>Aucun utilisateur trouvé.</p>
          ) : (
            utilisateurs.map((user) => {
              // garde-fous champ par champ
              const id = user?.id ?? Math.random();
              const pseudoAff = formatPseudo(user?.pseudo ?? "");
              const photo = photoUrls[id] || "/default.jpg";
              const age = user?.age ?? "—";
              const loc = user?.localisation ?? "—";
              const type = user?.type ?? "—";
              const statut = user?.statut === "en_ligne" ? "en_ligne" : "hors_ligne";
              const distanceTxt =
                user?.distance != null ? `${safeDistance(user.distance)} km de vous` : null;

              return (
                <Link href={`/profil/${id}`} key={id} className="profil-card-link">
                  <div className="profil-card">
                    <span
                      className={`statut-badge ${statut}`}
                      title={statut === "en_ligne" ? "En ligne" : "Hors ligne"}
                    />
                    <div className="profil-photo-wrapper">
                      <img
                        src={photo}
                        alt={pseudoAff}
                        className="profil-photo"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/default.jpg";
                        }}
                      />
                      {user?.verificationIdentiteStatut === true && (
                        <img
                          src="/Profilverif.png"
                          alt="Vérifié"
                          className="badge-verifie-overlay"
                          title="Profil vérifié"
                        />
                      )}
                    </div>

                    <h2 className="profil-card-title">{pseudoAff}</h2>

                    <p className="profil-card-details">
                      {age} ans - {loc}
                    </p>

                    <p className="profil-card-details-type">{type}</p>

                    {distanceTxt && (
                      <p className="profil-card-distance">{distanceTxt}</p>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
