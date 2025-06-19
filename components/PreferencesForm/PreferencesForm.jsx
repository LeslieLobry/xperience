'use client';
import "../PreferencesForm/PreferencesForm.css"
import { useEffect, useState } from 'react';

const recherchesOptions = [
  "Hommes hétéros", "Femmes hétéros", "Couples hétéros", "Couples F Bi", "Couples H Bi", "Couples Bi",
  "Hommes Bi", "Gays", "Femmes Bi", "Lesbiennes", "Travestis", "Transgenres"
];

const enviesOptions = [
  "2+2", "BDSM", "Cam", "Candaulisme", "Chat", "Côte-à-côtisme", "Curieux", "Duo",
  "Echangisme", "Exhibition", "Extreme", "Feeling", "Fétichisme", "Gang bang", "Hard",
  "Mélangisme", "Papouilles", "Photos", "Pluralité", "Scénario", "Soft", "Trio", "Vidéos", "Voyeurisme"
];

export default function PreferencesForm({ onClose }) {
  const [recherches, setRecherches] = useState([]);
  const [envies, setEnvies] = useState([]);
  const [message, setMessage] = useState('');

 
  useEffect(() => {
    async function fetchPreferences() {
      const res = await fetch('/api/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setRecherches(data.recherches?.map(r => r.label) || []);
        setEnvies(data.envies?.map(e => e.label) || []);
      }
    }
    fetchPreferences();
  }, []);

  const handleCheckboxChange = (e, type) => {
    const value = e.target.value;
    const update = type === 'recherches' ? recherches : envies;
    const setUpdate = type === 'recherches' ? setRecherches : setEnvies;

    if (update.includes(value)) {
      setUpdate(update.filter((item) => item !== value));
    } else {
      setUpdate([...update, value]);
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
      if (onClose) onClose(); // fermeture de modale si besoin
    } else {
      setMessage("Erreur lors de l'enregistrement.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="preferences-form">
      <h2>Préférences</h2>

      <div className="preferences-columns">
  <div className="preferences-section">
    <h3>Je recherche</h3>
    <div className="checkbox-grid">
      {recherchesOptions.map((option, index) => (
        <label key={index} className="checkbox-item">
          <input
            type="checkbox"
            value={option}
            checked={recherches.includes(option)}
            onChange={(e) => handleCheckboxChange(e, 'recherches')}
          />
          {option}
        </label>
      ))}
    </div>
  </div>

  <div className="preferences-section">
    <h3>Mes envies</h3>
    <div className="checkbox-grid">
      {enviesOptions.map((option, index) => (
        <label key={index} className="checkbox-item">
          <input
            type="checkbox"
            value={option}
            checked={envies.includes(option)}
            onChange={(e) => handleCheckboxChange(e, 'envies')}
          />
          {option}
        </label>
      ))}
    </div>
  </div>
</div>

      <div className="form-actions">
        <button type="submit">Enregistrer</button>
        {onClose && (
          <button type="button" onClick={onClose}>Annuler</button>
        )}
        {message && <p className="message">{message}</p>}
      </div>
    </form>
  );
}
