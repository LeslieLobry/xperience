'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import './ProfilsDisplay.css';

function melangerProfils(array) {
  return array
    .map((val) => ({ val, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ val }) => val);
}

export default function ProfilsDisplay({ profils, afficherPlus = false }) {
  const [filtrerEnLigne, setFiltrerEnLigne] = useState(false);
  const [filtrerProches, setFiltrerProches] = useState(false);
  const [profilsAffiches, setProfilsAffiches] = useState(profils);
  const [loading, setLoading] = useState(false);

  const handleToggleProches = async () => {
    const nouveauStatut = !filtrerProches;
    setFiltrerProches(nouveauStatut);

    if (nouveauStatut) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const res = await fetch('/api/profils-proches', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ latitude, longitude }),
            });
            
            const data = await res.json();
            console.log("📦 Profils proches reçus :", data);
            setProfilsAffiches(data);
          } catch (err) {
            console.error('Erreur chargement profils proches :', err);
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          console.error('Erreur géolocalisation :', error);
          setLoading(false);
        }
      );
    } else {
      setProfilsAffiches(profils); // revenir à la liste d’origine
    }
  };

  const profilsFiltres = useMemo(() => {
    const base = filtrerEnLigne
      ? profilsAffiches.filter((p) => p.statut === 'en_ligne')
      : profilsAffiches;

    return melangerProfils(base);
  }, [filtrerEnLigne, profilsAffiches]);

  return (
    <div className="profil-list1">
      <h1 className="profil-list1-title">Profils</h1>

  <div className="profil-toggle-wrapper">
  <div className="toggle-box">
    <label className={`toggle-label ${filtrerEnLigne ? 'active' : ''}`}>
      <input
        type="checkbox"
        checked={filtrerEnLigne}
        onChange={() => setFiltrerEnLigne((prev) => !prev)}
      />
      <span className="slider"></span>
      En ligne
    </label>

    <label className={`toggle-label ${filtrerProches ? 'active' : ''}`}>
      <input
        type="checkbox"
        checked={filtrerProches}
        onChange={handleToggleProches}
      />
      <span className="slider"></span>
      Près de chez moi (≤ 20 km)
    </label>
  </div>
</div>

{loading ? (
  <p>Chargement des profils proches...</p>
) : (
  <div className="grid-profil">
    {profilsFiltres.length === 0 ? (
      <p>Aucun profil trouvé pour ce filtre.</p>
    ) : (
      profilsFiltres.map((user) => (
        <Link
          href={`/profil/${user.id}`}
          key={user.id}
          className="profil-card-link"
        >
          <div className="profil-card">
            <span
              className={`statut-badge ${
                user.statut === 'en_ligne' ? 'en-ligne' : 'hors-ligne'
              }`}
              title={user.statut === 'en_ligne' ? 'En ligne' : 'Hors ligne'}
            />
            <img
              src={
                user.photoUrl?.startsWith('http')
                  ? user.photoUrl
                  : user.photoUrl
                  ? `/uploads/${user.photoUrl.replace(/^\/?uploads\//, '')}`
                  : '/default.jpg'
              }
              alt={user.pseudo}
              className="profil-photo"
            />
            <h2 className="profil-card-title">
              {user.pseudo.charAt(0).toUpperCase() +
                user.pseudo.slice(1).toLowerCase()}
            </h2>
            <p className="profil-card-details">
              {user.age} ans - {user.localisation}
            </p>
            <p
              className="profil-card-details-type"
            >
              {user.type}
            </p>
            {user.distance && (
              <p
                className="profil-card-details"
                style={{ fontSize: '0.85em', color: '#999' }}
              >
                {user.distance.toFixed(1)} km de vous
              </p>
            )}
          </div>
        </Link>
      ))
    )}
  </div>
)}

      {afficherPlus && (
        <Link href="/profils" className="afficher-plus">
          Afficher plus
        </Link>
      )}
    </div>
  );
}
