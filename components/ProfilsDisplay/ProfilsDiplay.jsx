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

const profilsFiltres = useMemo(() => {
const base = filtrerEnLigne
? profils.filter((p) => p.statut === 'en_ligne')
: profils;

return melangerProfils(base);
}, [filtrerEnLigne, profils]);

return (
<div className="profil-list1">
  <h1 className="profil-list1-title">Profils</h1>

  <div className="profil-toggle-wrapper">
    <div className="switch-container">
      <span className="switch-label">Afficher seulement les profils en ligne</span>
      <label className="switch">
        <input type="checkbox" checked={filtrerEnLigne} onChange={()=> setFiltrerEnLigne((prev) => !prev)}
        />
        <span className="slider" />
      </label>
    </div>

  </div>

  <div className="grid-profil">
    {profilsFiltres.map((user) => (
    <Link href={`/profil/${user.id}`} key={user.id} className="profil-card-link">
    <div className="profil-card">
      {/* Pastille en haut à droite */}
      <span className={`statut-badge ${ user.statut==='en_ligne' ? 'en-ligne' : 'hors-ligne' }`}
        title={user.statut==='en_ligne' ? 'En ligne' : 'Hors ligne' } />
      <img src={ user.photoUrl?.startsWith('http') ? user.photoUrl : user.photoUrl ?
        `/uploads/${user.photoUrl.replace(/^\/?uploads\//, '' )}` : '/default.jpg' } alt={user.pseudo}
        className="profil-photo" />
      <h2 className="profil-card-title">{user.pseudo}</h2>
      <p className="profil-card-details">
        {user.age} ans - {user.localisation}
      </p>
    </div>
    </Link>
    ))}

    {afficherPlus && (
    <Link href="/profils" className="afficher-plus">
    Afficher plus
    </Link>
    )}
  </div>
</div>
);
}