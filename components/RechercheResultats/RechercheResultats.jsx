"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import '../ProfilsDisplay/ProfilsDisplay.css';

export default function RechercheResultats() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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
                  src={
                    user.photoUrl?.startsWith("http")
                      ? user.photoUrl
                      : user.photoUrl
                      ? `/uploads/${user.photoUrl.replace(/^\/?uploads\//, "")}`
                      : "/default.jpg"
                  }
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
