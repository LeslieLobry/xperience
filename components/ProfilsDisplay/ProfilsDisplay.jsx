"use client";
import { useState, useMemo, useEffect } from 'react';
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
const [distance, setDistance] = useState(20);

// Nouveau : stockage des presigned URLs par userId
const [photoUrls, setPhotoUrls] = useState({});

// Quand la liste à afficher change, on (re)charge les presigned urls
const profilsFiltres = useMemo(() => {
const base = filtrerEnLigne
? profilsAffiches.filter((p) => p.statut === 'en_ligne')
: profilsAffiches;
return melangerProfils(base);
}, [filtrerEnLigne, profilsAffiches]);

useEffect(() => {
let canceled = false;
// On va chercher toutes les presigned urls en parallèle !
const loadAllUrls = async () => {
const newUrls = {};
await Promise.all(
profilsFiltres.map(async (user) => {
if (!user.photoUrl) {
newUrls[user.id] = "/default.jpg";
return;
}
// Pour éviter de spam si déjà présente
if (photoUrls[user.id]) {
newUrls[user.id] = photoUrls[user.id];
return;
}
if (user.photoUrl.startsWith("http")) {
newUrls[user.id] = user.photoUrl;
return;
}
try {
const res = await fetch("/api/photos/presign", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ key: user.photoUrl }),
});
const data = await res.json();
newUrls[user.id] = data.url || "/default.jpg";
} catch {
newUrls[user.id] = "/default.jpg";
}
})
);
if (!canceled) setPhotoUrls(newUrls);
};
loadAllUrls();
return () => { canceled = true; };

}, [JSON.stringify(profilsFiltres)]);

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
setProfilsAffiches(profils);
}
};

const handleDistanceChange = (e) => {
const val = Number(e.target.value);
setDistance(val);
if (filtrerProches) {
handleToggleProches(true, val);
}
};


return (
<div className="profil-list1">
  <h1 className="profil-list1-title">Profils</h1>
  <div className="profil-toggle-wrapper">
    <div className="toggle-box">
      <label className={`toggle-label ${filtrerEnLigne ? 'active' : '' }`}>
        <input type="checkbox" checked={filtrerEnLigne} onChange={()=> setFiltrerEnLigne((prev) => !prev)}
        />
        <span className="slider"></span>
        En ligne
      </label>
      <label className="toggle-label" style={{ alignItems: "center", gap: 8 }}>
        <input type="checkbox" checked={filtrerProches} onChange={(e)=> handleToggleProches(e.target.checked)}
        />
        <span className="slider"></span>
        Près de moi
        <input type="range" min={5} max={300} step={1} value={distance} onChange={handleDistanceChange}
          disabled={!filtrerProches} className="profil-range" style={{
                margin: "0 10px",
                width: 120,
                verticalAlign: "middle",
                opacity: filtrerProches ? 1 : 0.5,
                pointerEvents: filtrerProches ? "auto" : "none"
              }} />
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
    <Link href={`/profil/${user.id}`} key={user.id} className="profil-card-link">
    <div className="profil-card">
      <span className={`statut-badge ${user.statut==='en_ligne' ? 'en-ligne' : 'hors-ligne' }`}
        title={user.statut==='en_ligne' ? 'En ligne' : 'Hors ligne' } />
      <div className="profil-photo-wrapper">
        <img src={photoUrls[user.id] || "/default.jpg" } alt={user.pseudo} className="profil-photo" onError={(e)=> {
        e.target.onerror = null;
        e.target.src = '/default.jpg';
        }}
        />
        {user.verificationIdentiteStatut && (
        <img src="/Profilverif.png" alt="Vérifié" className="badge-verifie-overlay" title="Profil vérifié" />
        )}
      </div>

      <h2 className="profil-card-title">
        {user.pseudo.charAt(0).toUpperCase() + user.pseudo.slice(1).toLowerCase()}
      </h2>
      <p className="profil-card-details">
        {user.age} ans - {user.localisation}
      </p>
      <p className="profil-card-details-type">
        {user.type}
      </p>
      {user.distance && (
      <p className="profil-card-details" style={{ color: '#999' }}>
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