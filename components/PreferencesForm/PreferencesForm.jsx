'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const recherchesOptions = [
  "Hommes hétéros", "Femmes hétéros", "Couples hétéros", "Couples F Bi", "Couples H Bi", "Couples Bi",
  "Hommes Bi", "Gays", "Femmes Bi", "Lesbiennes", "Travestis", "Transgenres"
];

const enviesOptions = [
  "2+2", "BDSM", "Cam", "Candualisme", "Chat", "Côte-à-côtisme", "Curieux", "Duo",
  "Echangisme", "Exhibition", "Extreme", "Feeling", "Fétichisme", "Gang bang", "Hard",
  "Mélangisme", "Papouilles", "Photos", "Pluralité", "Scénario", "Soft", "Trio", "Vidéos", "Voyeurisme"
];

export default function PreferencesForm() {
  const [recherches, setRecherches] = useState([]);
  const [envies, setEnvies] = useState([]);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleCheckboxChange = (e, type) => {
    const value = e.target.value;
    if (type === 'recherches') {
      setRecherches(prev =>
        prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
      );
    } else {
      setEnvies(prev =>
        prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const res = await fetch('/api/update-preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recherches, envies }),
      credentials: 'include',
    });

    if (res.ok) {
      setMessage('Préférences enregistrées avec succès !');
    } else {
      setMessage('Erreur lors de l\'enregistrement.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="preferences-form">
      <h2 className="form-title">Préférences</h2>

      <div className="form-grid">
        <div className="form-column">
          <h3>Je recherche</h3>
          {recherchesOptions.map((option, index) => (
            <div key={index} className="checkbox-group">
              <input
                type="checkbox"
                id={`recherche-${index}`}
                value={option}
                checked={recherches.includes(option)}
                onChange={(e) => handleCheckboxChange(e, 'recherches')}
              />
              <label htmlFor={`recherche-${index}`}>{option}</label>
            </div>
          ))}
        </div>

        <div className="form-column">
          <h3>Mes envies</h3>
          {enviesOptions.map((option, index) => (
            <div key={index} className="checkbox-group">
              <input
                type="checkbox"
                id={`envie-${index}`}
                value={option}
                checked={envies.includes(option)}
                onChange={(e) => handleCheckboxChange(e, 'envies')}
              />
              <label htmlFor={`envie-${index}`}>{option}</label>
            </div>
          ))}
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="save-button">
          Enregistrer
        </button>

        <button type="button" onClick={() => router.back()} className="cancel-button">
          Annuler
        </button>

        {message && <p className="message">{message}</p>}
      </div>
    </form>
  );
}
