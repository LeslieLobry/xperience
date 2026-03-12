"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "../ProfilsDisplay/ProfilsDisplay.css";
import "./RechercheResultats.css";
import { useOnlineStatus } from "../../context/OnlineStatusContext";
import { getUserDisplayStatus } from "../../lib/getUserDisplayStatus";

/* ---------------- Hook presign ---------------- */
function usePresignedPhotos(users) {
  const [photoUrls, setPhotoUrls] = useState({});

  const usersKey = useMemo(() => {
    return Array.isArray(users)
      ? users.map((u) => `${u?.id}-${u?.photoUrl || ""}`).join("|")
      : "";
  }, [users]);

  useEffect(() => {
    let canceled = false;

    async function fetchAll() {
      const result = {};

      await Promise.all(
        users.map(async (user) => {
          const key = user?.photoUrl;

          if (!user?.id) return;

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

      if (!canceled) {
        setPhotoUrls(result);
      }
    }

    if (Array.isArray(users) && users.length) {
      fetchAll();
    } else {
      setPhotoUrls({});
    }

    return () => {
      canceled = true;
    };
  }, [users, usersKey]);

  return photoUrls;
}

const DEFAULT_RAYON = 20;

// helpers
function normalizeType(val) {
  return String(val || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function RechercheResultats({
  className = "",

  pseudo = "",
  type = [],
  orientation = [],
  rechercheType = [],
  ageMin = "",
  ageMax = "",
  localisation = "",
  photo = false,
  description = false,
  statut = "all",
  experience = [],
  fumeur = [],
  silhouette = [],
  taille = [],
  origines = [],
  yeux = [],
  cheveux = [],
  recherches = [],
  envies = [],
  rayon = "",

  autourDeMoi = false,
  latitude = null,
  longitude = null,
  loadingGeo = false,
  geoError = null,
}) {
  const router = useRouter();
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const photoUrls = usePresignedPhotos(utilisateurs);
  const { isOnline, ready, debug } = useOnlineStatus();

  const hasParams = useMemo(() => {
    return (
      !!autourDeMoi ||
      !!pseudo ||
      (Array.isArray(type) && type.length) ||
      (Array.isArray(orientation) && orientation.length) ||
      (Array.isArray(rechercheType) && rechercheType.length) ||
      ageMin !== "" ||
      ageMax !== "" ||
      !!localisation ||
      photo ||
      description ||
      (statut && statut !== "all") ||
      (Array.isArray(experience) && experience.length) ||
      (Array.isArray(fumeur) && fumeur.length) ||
      (Array.isArray(silhouette) && silhouette.length) ||
      (Array.isArray(taille) && taille.length) ||
      (Array.isArray(origines) && origines.length) ||
      (Array.isArray(yeux) && yeux.length) ||
      (Array.isArray(cheveux) && cheveux.length) ||
      (Array.isArray(recherches) && recherches.length) ||
      (Array.isArray(envies) && envies.length)
    );
  }, [
    autourDeMoi,
    pseudo,
    type,
    orientation,
    rechercheType,
    ageMin,
    ageMax,
    localisation,
    photo,
    description,
    statut,
    experience,
    fumeur,
    silhouette,
    taille,
    origines,
    yeux,
    cheveux,
    recherches,
    envies,
  ]);

  useEffect(() => {
    console.log("[RechercheResultats] STATE", {
      ready,
      onlineDebug: debug,
      usersLen: utilisateurs.length,
      hasParams,
      loading,
    });
  }, [ready, debug, utilisateurs.length, hasParams, loading]);

  useEffect(() => {
    const controller = new AbortController();

    if (!hasParams) {
      setUtilisateurs([]);
      setHasSearched(false);
      setLoading(false);
      return () => controller.abort();
    }

    setHasSearched(true);
    setLoading(true);

    const distance = Number(rayon || DEFAULT_RAYON);

    const filters = {
      pseudo: pseudo || "",
      statut: statut || "all",
      ageMin: ageMin !== "" ? Number(ageMin) : null,
      ageMax: ageMax !== "" ? Number(ageMax) : null,
      photo: !!photo,
      description: !!description,
      localisation: localisation || "",

      type: (type || []).map(normalizeType),
      orientation: orientation || [],
      rechercheType: rechercheType || [],
      experience: experience || [],
      fumeur: fumeur || [],
      silhouette: silhouette || [],
      taille: taille || [],
      origines: origines || [],
      yeux: yeux || [],
      cheveux: cheveux || [],
      recherches: recherches || [],
      envies: envies || [],
    };

    async function load() {
      try {
        if (autourDeMoi) {
          if (loadingGeo) {
            setLoading(false);
            return;
          }

          if (geoError) {
            console.error("geoError:", geoError);
            setUtilisateurs([]);
            setLoading(false);
            return;
          }

          if (latitude == null || longitude == null) {
            setUtilisateurs([]);
            setLoading(false);
            return;
          }

          const res = await fetch("/api/profils-proches", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            signal: controller.signal,
            body: JSON.stringify({
              latitude,
              longitude,
              distance,
              filters,
            }),
          });

          const data = await res.json().catch(() => null);

          const list = Array.isArray(data)
            ? data
            : Array.isArray(data?.proches)
            ? data.proches
            : [];

          setUtilisateurs(list);
          setLoading(false);
          return;
        }

        const params = new URLSearchParams();

        if (pseudo) params.set("pseudo", pseudo);
        (type || []).forEach((x) => params.append("type", x));
        (orientation || []).forEach((x) => params.append("orientation", x));
        (rechercheType || []).forEach((x) =>
          params.append("rechercheType", x)
        );
        if (ageMin !== "") params.set("ageMin", String(ageMin));
        if (ageMax !== "") params.set("ageMax", String(ageMax));
        if (localisation) params.set("localisation", localisation);
        if (photo) params.set("photo", "true");
        if (description) params.set("description", "true");
        if (statut && statut !== "all") params.set("statut", statut);
        (experience || []).forEach((x) => params.append("experience", x));
        (fumeur || []).forEach((x) => params.append("fumeur", x));
        (silhouette || []).forEach((x) => params.append("silhouette", x));
        (taille || []).forEach((x) => params.append("taille", x));
        (origines || []).forEach((x) => params.append("origines", x));
        (yeux || []).forEach((x) => params.append("yeux", x));
        (cheveux || []).forEach((x) => params.append("cheveux", x));
        (recherches || []).forEach((x) => params.append("recherches", x));
        (envies || []).forEach((x) => params.append("envies", x));
        if (rayon !== "") params.set("rayon", String(rayon));

        const res = await fetch(`/api/recherche?${params.toString()}`, {
          signal: controller.signal,
          credentials: "include",
        });

        const data = await res.json().catch(() => null);
        setUtilisateurs(Array.isArray(data?.utilisateurs) ? data.utilisateurs : []);
        setLoading(false);
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.error("[RechercheResultats] load error:", err);
          setLoading(false);
        }
      }
    }

    load();

    return () => controller.abort();
  }, [
    hasParams,
    pseudo,
    type,
    orientation,
    rechercheType,
    ageMin,
    ageMax,
    localisation,
    photo,
    description,
    statut,
    experience,
    fumeur,
    silhouette,
    taille,
    origines,
    yeux,
    cheveux,
    recherches,
    envies,
    rayon,
    autourDeMoi,
    latitude,
    longitude,
    loadingGeo,
    geoError,
  ]);

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

      {autourDeMoi && loadingGeo && <p>📍 Récupération de ta position…</p>}
      {autourDeMoi && geoError && <p style={{ color: "red" }}>{geoError}</p>}

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <div className="grid-profil-search">
          {utilisateurs.length === 0 ? (
            <p>Aucun utilisateur trouvé.</p>
          ) : (
            utilisateurs.map((user) => {
              const statutEff = getUserDisplayStatus(user, isOnline(user?.id));
              const online = statutEff === "en_ligne";

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