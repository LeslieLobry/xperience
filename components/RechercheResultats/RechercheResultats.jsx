"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "../ProfilsDisplay/ProfilsDisplay.css";
import "./RechercheResultats.css";
import { useOnlineStatus } from "../../context/OnlineStatusContext";

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
          if (!key) {
            result[user.id] = "/default.jpg";
            return;
          }
          if (typeof key === "string" && key.startsWith("http")) {
            result[user.id] = key;
            return;
          }
          try {
            const res = await fetch("/api/photos/presign", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ key }),
            });
            const data = await res.json().catch(() => null);
            result[user.id] = data?.url || "/default.jpg";
          } catch {
            result[user.id] = "/default.jpg";
          }
        })
      );
      if (!canceled) setPhotoUrls(result);
    }
    if (Array.isArray(users) && users.length) fetchAll();
    else setPhotoUrls({});
    return () => {
      canceled = true;
    };
  }, [JSON.stringify(users)]);
  return photoUrls;
}

const DEFAULT_RAYON = 20;

export default function RechercheResultats({
  className = "",
  // ✅ props venant du parent (RechercheClient)
  autourDeMoi = false,
  latitude = null,
  longitude = null,
  loadingGeo = false,
  geoError = null,
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const photoUrls = usePresignedPhotos(utilisateurs);

  // ✅ ONLINE via Ably presence
  const { isOnline } = useOnlineStatus();

  const hasParams = useMemo(
    () => Array.from(searchParams.keys()).length > 0,
    [searchParams]
  );

  useEffect(() => {
    const paramsStr = searchParams.toString();

    // 🔁 Si plus de paramètres -> reset
    if (!paramsStr) {
      setUtilisateurs([]);
      setHasSearched(false);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setHasSearched(true);

    // ✅ détecte autourDeMoi (depuis l’URL OU prop)
    const autourUrl = (searchParams.get("autourDeMoi") || "") === "true";
    const autour = Boolean(autourDeMoi || autourUrl);

    const distance = Number(searchParams.get("rayon") || DEFAULT_RAYON);

    // ✅ construit les filtres à envoyer à /api/profils-proches
    const filters = {
      pseudo: searchParams.get("pseudo") || "",
      statut: searchParams.get("statut") || "all",
      ageMin: searchParams.get("ageMin") || "",
      ageMax: searchParams.get("ageMax") || "",
      photo: searchParams.get("photo") === "true",
      description: searchParams.get("description") === "true",
      localisation: searchParams.get("localisation") || "",

      // arrays
      type: searchParams.getAll("type"),
      orientation: searchParams.getAll("orientation"),
      rechercheType: searchParams.getAll("rechercheType"),
      experience: searchParams.getAll("experience"),
      fumeur: searchParams.getAll("fumeur"),
      silhouette: searchParams.getAll("silhouette"),
      taille: searchParams.getAll("taille"),
      origines: searchParams.getAll("origines"),
      yeux: searchParams.getAll("yeux"),
      cheveux: searchParams.getAll("cheveux"),
      recherches: searchParams.getAll("recherches"),
      envies: searchParams.getAll("envies"),
    };

    // normalise numbers (si vide => null)
    const ageMinNum = filters.ageMin !== "" ? Number(filters.ageMin) : null;
    const ageMaxNum = filters.ageMax !== "" ? Number(filters.ageMax) : null;

    async function load() {
      try {
        if (autour) {
          // ✅ ON N’APPELLE PAS navigator.geolocation ici.
          // On attend les coords du parent.
          if (loadingGeo) {
            setUtilisateurs([]);
            setLoading(false);
            return;
          }

          if (geoError) {
            console.error("Geo error:", geoError);
            setUtilisateurs([]);
            setLoading(false);
            return;
          }

          if (latitude == null || longitude == null) {
            // coords pas prêtes
            setUtilisateurs([]);
            setLoading(false);
            return;
          }

          // ✅ POST vers /api/profils-proches + filtres
          const res = await fetch("/api/profils-proches", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            signal: controller.signal,
            body: JSON.stringify({
              latitude,
              longitude,
              distance,
              filters: {
                ...filters,
                ageMin: ageMinNum,
                ageMax: ageMaxNum,
              },
            }),
          });

          const data = await res.json().catch(() => null);

          const list = Array.isArray(data)
            ? data
            : Array.isArray(data?.utilisateurs)
            ? data.utilisateurs
            : [];

          setUtilisateurs(list);
          setLoading(false);
          return;
        }

        // ✅ recherche classique (ville / filtres sans GPS)
        const res = await fetch(`/api/recherche?${paramsStr}`, {
          signal: controller.signal,
          credentials: "include",
        });

        const data = await res.json().catch(() => null);
        setUtilisateurs(Array.isArray(data?.utilisateurs) ? data.utilisateurs : []);
        setLoading(false);
      } catch (err) {
        if (err?.name !== "AbortError") setLoading(false);
      }
    }

    load();

    return () => controller.abort();
  }, [searchParams, autourDeMoi, latitude, longitude, loadingGeo, geoError]);

  if (!hasSearched) return null;

  const handleResetSearch = () => {
    setUtilisateurs([]);
    setHasSearched(false);
    setLoading(false);
    router.push("/recherche");
  };

  const handleGoHome = () => router.push("/accueil-page");

  const autourUrl = (searchParams.get("autourDeMoi") || "") === "true";
  const autour = Boolean(autourDeMoi || autourUrl);

  return (
    <div className={`profil-list1 ${className}`}>
      {hasParams && (
        <div
          className="recherche-toolbar2"
          role="region"
          aria-label="Actions de recherche"
        >
          <button className="btn-outlined" onClick={handleResetSearch}>
            Nouvelle recherche
          </button>
          <button className="btn-primary" onClick={handleGoHome}>
            Accueil
          </button>
        </div>
      )}

      <h1 className="profil-list1-title">Résultats de recherche</h1>

      {/* ✅ état géoloc lisible */}
      {autour && loadingGeo && <p>Géolocalisation en cours…</p>}
      {autour && !loadingGeo && geoError && <p>{geoError}</p>}

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <div className="grid-profil-search">
          {utilisateurs.length === 0 ? (
            <p>Aucun utilisateur trouvé.</p>
          ) : (
            utilisateurs.map((user) => {
              const online = isOnline(user?.id);

              return (
                <Link
                  href={`/profil/${user.id}`}
                  key={user.id}
                  className="profil-card-link"
                >
                  <div className="profil-card">
                    <span
                      className={`statut-badge ${
                        online ? "en-ligne" : "hors-ligne"
                      }`}
                      title={online ? "En ligne" : "Hors ligne"}
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
                      {user.pseudo?.charAt(0)?.toUpperCase() +
                        user.pseudo?.slice(1)?.toLowerCase()}
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
              );
            })
          )}
        </div>
      )}
    </div>
  );
}