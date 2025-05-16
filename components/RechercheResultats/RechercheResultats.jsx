'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function RechercheResultats() {
  const searchParams = useSearchParams();
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const query = params.toString();

    fetch(`/api/recherche?${query}`)
      .then((res) => res.json())
      .then((data) => {
        setUtilisateurs(data.utilisateurs);
        setLoading(false);
      });
  }, [searchParams]);

  if (loading) return <p>Chargement...</p>;

  return (
    <div className="recherche-resultats">
      <h1>Résultats de recherche</h1>
      {utilisateurs.length === 0 && <p>Aucun utilisateur trouvé.</p>}
      <ul>
        {utilisateurs.map((u) => (
          <li key={u.id} className="resultat-item">
            {u.photoUrl && (
              <img src={u.photoUrl} className="resultat-photo" alt={u.pseudo} />
            )}
            <div>
              <strong>{u.pseudo}</strong> ({u.age} ans) - {u.localisation}
              <p>{u.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
