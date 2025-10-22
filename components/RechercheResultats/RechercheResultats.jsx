"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "../ProfilsDisplay/ProfilsDisplay.css";
import "./RechercheResultats.css";

/* ---------------- Hook presign ---------------- */
function usePresignedPhotos(users) {
  const [photoUrls, setPhotoUrls] = useState({});
  useEffect(() => {
    let canceled = false;
    async function fetchAll() {
      const result = {};
      await Promise.all(
        users.map(async (user) => {
          const key = user?.photoUrl;
          if (!key) { result[user.id] = "/default.jpg"; return; }
          if (typeof key === "string" && key.startsWith("http")) {
            result[user.id] = key;
            return;
          }
          try {
            const res = await fetch("/api/photos/presign", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key }),
            });
            const data = await res.json();
            result[user.id] = data.url || "/default.jpg";
          } catch {
            result[user.id] = "/default.jpg";
          }
        })
      );
      if (!canceled) setPhotoUrls(result);
    }
    if (Array.isArray(users) && users.length) fetchAll();
    else setPhotoUrls({});
    return () => { canceled = true; };
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
    () => Array.from(searchParams.keys()).length > 0,
    [searchParams]
  );

  useEffect(() => {
    const params = searchParams.toString();
    if (!params) return;
    setLoading(true);
    setHasSearched(true);
    fetch(`/api/recherche?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setUtilisateurs(Array.isArray(data.utilisateurs) ? data.utilisateurs : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [searchParams]);

  if (!hasSearched) return null;

  const handleResetSearch = () => router.push("/recherche"); 
  const handleGoHome = () => router.push("/accueil-page");        // change en "/" si besoin

  // --- Ajouts UI : chips de filtres actifs (non destructif, on ne retire rien)
  const activeFilters = useMemo(() => {
    const entries = Array.from(searchParams.entries())
      .filter(([k, v]) => v && !["page"].includes(k));
    return entries.slice(0, 12); // limite visuelle
  }, [searchParams]);

  return (
    <div className={`profil-list1 ${className}`}>
      {/* Barre d’actions (visible même en chargement) */}
      {hasParams && (
        <div
          className="recherche-toolbar"               // ✨ même classe que chez toi, libre à toi de la styler
          role="region"
          aria-label="Actions de recherche"
        >
          {/* Colonne gauche : tes boutons ORIGINAUX conservés, simplement encapsulés */}
          <div className="rt-left">
            {/* Icône + ton bouton existant : Nouvelle recherche */}
            <button className="btn-outlined" onClick={handleResetSearch} title="Nouvelle recherche">
              {/* petite icône inline non bloquante */}
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" style={{ marginRight: 6 }}>
                <path d="M12 5V2L7 6l5 4V7c3.31 0 6 2.69 6 6a6 6 0 1 1-6-6" fill="currentColor"/>
              </svg>
              Nouvelle recherche
            </button>

            {/* Séparateur discret */}
            <span className="rt-divider" aria-hidden="true" />

            {/* Icône + ton bouton existant : Accueil */}
            <button className="btn-primary" onClick={handleGoHome} title="Accueil">
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" style={{ marginRight: 6 }}>
                <path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z" fill="currentColor"/>
              </svg>
              Accueil
            </button>

            {/* Compteur de résultats (non intrusif) */}
            <span className="rt-count" aria-live="polite">
              {utilisateurs.length} résultat{utilisateurs.length > 1 ? "s" : ""}
            </span>
          </div>

          {/* Colonne droite : puces de filtres actifs (read-only, on ne supprime rien) */}
          {activeFilters.length > 0 && (
            <div className="rt-filters" role="list" aria-label="Filtres actifs">
              {activeFilters.map(([k, v]) => (
                <span className="chip" key={`${k}-${v}`} role="listitem" title={`${k}=${v}`}>
                  <strong>{k}</strong><span className="chip-sep">:</span>
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
          {utilisateurs.length === 0 ? (
            <p>Aucun utilisateur trouvé.</p>
          ) : (
            utilisateurs.map((user) => (
              <Link href={`/profil/${user.id}`} key={user.id} className="profil-card-link">
                <div className="profil-card">
                  <span
                    className={`statut-badge ${user.statut === "en_ligne" ? "en-ligne" : "hors-ligne"}`}
                    title={user.statut === "en_ligne" ? "En ligne" : "Hors ligne"}
                  />
                  <div className="profil-photo-wrapper">
                    <img
                      src={photoUrls[user.id] || "/default.jpg"}
                      alt={user.pseudo}
                      className="profil-photo"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/default.jpg";
                      }}
                    />
                    {user.verificationIdentiteStatut === true && (
                      <img
                        src="/Profilverif.png"
                        alt="Vérifié"
                        className="badge-verifie-overlay"
                        title="Profil vérifié"
                      />
                    )}
                  </div>

                  <h2 className="profil-card-title">
                    {user.pseudo.charAt(0).toUpperCase() + user.pseudo.slice(1).toLowerCase()}
                  </h2>

                  <p className="profil-card-details">
                    {user.age} ans - {user.localisation}
                  </p>

                  <p className="profil-card-details-type">{user.type}</p>

                  {user.distance != null && (
                    <p className="profil-card-distance">
                      {Number(user.distance).toFixed(1)} km de vous
                    </p>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
