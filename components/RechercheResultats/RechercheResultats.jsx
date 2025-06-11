"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import "./RechercheResultats.css"; // pour ajouter ton propre style

export default function RechercheResultats() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
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
            className="card"
            onClick={() => router.push(`/profil/${u.id}`)}
          >
            {u.photoUrl && (
              <img src={u.photoUrl} alt={u.pseudo} className="card-photo" />
            )}
            <div className="card-content">
              <h3>{u.pseudo} ({u.age} ans)</h3>
              <p className="card-localisation">{u.localisation}</p>
              <p className="card-description">{u.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
