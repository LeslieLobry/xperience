"use client";
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
  const [profilsAffiches, setProfilsAffiches] = useState(profils);
  const [loading, setLoading] = useState(false);

  // ---- Filtre distance dynamique
  const [filtrerProches, setFiltrerProches] = useState(false);
  const [distance, setDistance] = useState(20); // Valeur initiale (20km)

  // Quand on coche/décoche "Près de moi" ou modifie la distance
  const handleToggleProches = async (active, customDistance) => {
    setFiltrerProches(active);
    if (active) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const res = await fetch('/api/profils-proches', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                latitude,
                longitude,
                distance: customDistance || distance,
              }),
            });
            const data = await res.json();
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
      setProfilsAffiches(profils); // Revenir à la liste initiale
    }
  };

  // Quand l'utilisateur bouge le slider
  const handleDistanceChange = (e) => {
    const val = Number(e.target.value);
    setDistance(val);
    if (filtrerProches) {
      handleToggleProches(true, val); // Rafraîchit la liste sur chaque changement
    }
  };

  // Filtrage et mélange
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

          {/* Nouveau: toggle + slider distance */}
         <label className="toggle-label" style={{ alignItems: "center", gap: 8 }}>
  <input
    type="checkbox"
    checked={filtrerProches}
    onChange={(e) => handleToggleProches(e.target.checked)}
  />
  <span className="slider"></span>
  Près de moi
  <input
    type="range"
    min={5}
    max={300}
    step={1}
    value={distance}
    onChange={handleDistanceChange}
    disabled={!filtrerProches}
    className="profil-range"
    style={{
      margin: "0 10px",
      width: 120,
      verticalAlign: "middle",
      opacity: filtrerProches ? 1 : 0.5,
      pointerEvents: filtrerProches ? "auto" : "none"
    }}
  />
  <span style={{ minWidth: 32, display: "inline-block" }}>{distance} km</span>
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
                    className={`statut-badge ${user.statut === 'en_ligne' ? 'en-ligne' : 'hors-ligne'}`}
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
                  <p className="profil-card-details-type">
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

      {afficherPlus && !filtrerProches && (
  <Link href="/profils" className="afficher-plus">
    Afficher plus
  </Link>
)}

    </div>
  );
}
