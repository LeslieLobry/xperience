'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import './PreferencesSummary.css';

export default function PreferencesSummary() {
  const [recherches, setRecherches] = useState([]);
  const [envies, setEnvies] = useState([]);
  const router = useRouter();

  useEffect(() => {
    async function fetchPreferences() {
      const res = await fetch('/api/me', { credentials: 'include' });

      if (res.ok) {
        const data = await res.json();
        setRecherches(data.recherches || []);
        setEnvies(data.envies || []);
      }
    }

    fetchPreferences();
  }, []);

  return (
    <div className="preferences-summary">
      <div className="preferences-header">
        <h2>Préférences</h2>
        <button className="edit-button" onClick={() => router.push('/profil/preferences')}>
          Modifier
        </button>
      </div>

      <div className="preferences-section">
        <h3>Je recherche</h3>
        {recherches.length > 0 ? (
          <ul>
            {recherches.map((r, idx) => (
              <li key={idx}>{r.label}</li>
            ))}
          </ul>
        ) : (
          <p className="not-defined">Non défini</p>
        )}
      </div>

      <div className="preferences-section">
        <h3>Mes envies</h3>
        {envies.length > 0 ? (
          <ul>
            {envies.map((e, idx) => (
              <li key={idx}>{e.label}</li>
            ))}
          </ul>
        ) : (
          <p className="not-defined">Non défini</p>
        )}
      </div>
    </div>
  );
}
