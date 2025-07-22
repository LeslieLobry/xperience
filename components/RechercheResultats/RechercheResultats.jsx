"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import '../ProfilsDisplay/ProfilsDisplay.css';

// --- Ajoute le hook ici ---
function usePresignedPhotos(users) {
  const [photoUrls, setPhotoUrls] = useState({});
  useEffect(() => {
    let canceled = false;
    async function fetchAll() {
      const result = {};
      await Promise.all(
        users.map(async (user) => {
          if (!user.photoUrl) { result[user.id] = "/default.jpg"; return; }
          if (user.photoUrl.startsWith("http")) { result[user.id] = user.photoUrl; return; }
          try {
            const res = await fetch("/api/photos/presign", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key: user.photoUrl }),
            });
            const data = await res.json();
            result[user.id] = data.url || "/default.jpg";
          } catch { result[user.id] = "/default.jpg"; }
        })
      );
      if (!canceled) setPhotoUrls(result);
    }
    fetchAll();
    return () => { canceled = true; };
  }, [JSON.stringify(users)]);
  return photoUrls;
}

export default function RechercheResultats() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // --- Ajoute le hook ici
  const photoUrls = usePresignedPhotos(utilisateurs);

  useEffect(() => {
    const params = searchParams.toString();
    if (!params) return;
    setLoading(true);
    setHasSearched(true);

    fetch(`/api/recherche?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setUtilisateurs(data.utilisateurs || []);
        setLoading(false);
      });
  }, [searchParams]);

  if (!hasSearched) return null;
  if (loading) return <p>Chargement...</p>;

  return (
    <div className="profil-list1">
      <h1 className="profil-list1-title">Résultats de recherche</h1>

      <div className="grid-profil">
        {utilisateurs.length === 0 ? (
          <p>Aucun utilisateur trouvé.</p>
        ) : (
          utilisateurs.map((user) => (
            <Link
              href={`/profil/${user.id}`}
              key={user.id}
              className="profil-card-link"
            >
              <div className="profil-card">
                <span
                  className={`statut-badge ${
                    user.statut === "en_ligne" ? "en-ligne" : "hors-ligne"
                  }`}
                  title={user.statut === "en_ligne" ? "En ligne" : "Hors ligne"}
                />
                <img
                  src={photoUrls[user.id] || "/default.jpg"}
                  alt={user.pseudo}
                  className="profil-photo"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/default.jpg";
                  }}
                />
                <h2 className="profil-card-title">
                  {user.pseudo.charAt(0).toUpperCase() +
                    user.pseudo.slice(1).toLowerCase()}
                </h2>
                <p className="profil-card-details">
                  {user.age} ans - {user.localisation}
                </p>
                <p className="profil-card-details-type">{user.type}</p>
                {user.distance && (
                  <p
                    className="profil-card-details"
                    style={{ fontSize: "0.85em", color: "#999" }}
                  >
                    {user.distance.toFixed(1)} km de vous
                  </p>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
