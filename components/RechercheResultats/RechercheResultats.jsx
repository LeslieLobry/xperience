"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import "./RechercheResultats.css";

export default function RechercheResultats() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const params = searchParams.toString();
    if (!params.toString()) return;

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
    <div className="recherche-resultats">
      <h1>Résultats de recherche</h1>
      {utilisateurs.length === 0 && <p>Aucun utilisateur trouvé.</p>}

      <div className="resultats-grid">
        {utilisateurs.map((u) => (
          <div
            key={u.id}
            className="profil-card"
            onClick={() => router.push(`/profil/${u.id}`)}
          >
            <div className="profil-photo-wrapper">
              <img
                src={
                  u.photoUrl?.startsWith("http")
                    ? u.photoUrl
                    : u.photoUrl
                    ? `/uploads/${u.photoUrl.replace(/^\/?uploads\//, "")}`
                    : "/default.jpg"
                }
                alt={u.pseudo}
                className="profil-photo"
              />
            </div>
            <div className="profil-info">
              <h2 className="profil-card-title">{u.pseudo}</h2>
              <p className="profil-card-details">
                {u.age} ans - {u.localisation}
              </p>
              <p className="profil-card-type">
                {u.type}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
