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
    return () => {
      canceled = true;
    };
  }, [JSON.stringify(users)]);
  return photoUrls;
}

export default function RechercheResultats({
  className = "",
  // ✅ NEW props (autour de moi)
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

  // ✅ plus robuste que toString()
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

    // ✅ distance = rayon query (fallback 20)
    const distance = Number(searchParams.get("rayon") || 20);

    // ✅ MODE AUTOUR DE MOI : on attend la géoloc puis on appelle /api/profils-proches
    if (autourDeMoi) {
      // si géoloc en cours, on ne fetch pas encore
      if (loadingGeo) {
        setLoading(true);
        return () => controller.abort();
      }

      // si pas de coords, on stop proprement (sinon ça renvoie tout le monde)
      if (latitude == null || longitude == null) {
        setLoading(false);
        // on garde hasSearched=true pour afficher un message
        setUtilisateurs([]);
        return () => controller.abort();
      }

      fetch("/api/profils-proches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        credentials: "include",
        body: JSON.stringify({
          latitude,
          longitude,
          distance,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          // ton endpoint renvoie un array (comme dans ProfilsDisplay)
          setUtilisateurs(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch((err) => {
          if (err?.name !== "AbortError") setLoading(false);
        });

      return () => controller.abort();
    }

    // ✅ MODE CLASSIQUE : /api/recherche
    fetch(`/api/recherche?${paramsStr}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        setUtilisateurs(
          Array.isArray(data?.utilisateurs) ? data.utilisateurs : []
        );
        setLoading(false);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setLoading(false);
      });

    return () => controller.abort();
  }, [searchParams, autourDeMoi, latitude, longitude, loadingGeo]);

  if (!hasSearched) return null;

  const handleResetSearch = () => {
    setUtilisateurs([]);
    setHasSearched(false);
    setLoading(false);
    router.push("/recherche");
  };

  const handleGoHome = () => router.push("/accueil-page");

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

      {/* ✅ Message utile en mode autourDeMoi */}
      {autourDeMoi && (geoError || (latitude == null && longitude == null)) && (
        <p style={{ color: "#e0c084", fontWeight: 600 }}>
          {geoError
            ? `⚠️ ${geoError}`
            : "⚠️ Active la localisation pour voir les profils près de toi."}
        </p>
      )}

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
                      {user.pseudo.charAt(0).toUpperCase() +
                        user.pseudo.slice(1).toLowerCase()}
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
