'use client';

import { useState, useEffect } from 'react';
import "../ProfilDetailsForm/ProfilDetailsForm.css"

export default function ProfilDetailsForm({ onClose }) {
  const [form, setForm] = useState({
    localisation: '',
    experience: '',
    rechercheType: '',
    sexe: '',
    age: '',
    fumeur: '',
    silhouette: '',
    taille: '',
    origines: '',
    yeux: '',
    cheveux: ''
  });

  const [message, setMessage] = useState('');

  useEffect(() => {
    async function fetchData() {
      const res = await fetch('/api/me', { credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.user) {
        setForm(prev => ({ ...prev, ...data.user }));
      }
    }
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/update-profil', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(form)
    });

    if (res.ok) {
      setMessage('Profil mis à jour ✅');
      if (onClose) onClose();
    } else {
      setMessage("Erreur lors de l'enregistrement.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="profil-form">
      <h2>Modifier mon profil</h2>

      <input type="text" name="localisation" placeholder="Ville" value={form.localisation} onChange={handleChange} />
      <label htmlFor="experience">Expérience</label>
<select
  name="experience"
  id="experience"
  value={form.experience}
  onChange={handleChange}
>
  <option value="">Sélectionner...</option>
  <option value="A découvrir">A découvrir</option>
  <option value="Débutante">Débutante</option>
  <option value="Occasionnelle">Occasionnelle</option>
  <option value="Expérimentée">Expérimentée</option>
  <option value="Je la garde pour moi">Je la garde pour moi</option>
</select>

      <input type="text" name="rechercheType" placeholder="Type de recherche" value={form.rechercheType} onChange={handleChange} />
      <input type="text" name="sexe" placeholder="Sexe" value={form.sexe} onChange={handleChange} />
      <input type="number" name="age" placeholder="Âge" value={form.age} onChange={handleChange} />
      <input type="text" name="fumeur" placeholder="Fumeur (oui/non)" value={form.fumeur} onChange={handleChange} />
      <input type="text" name="silhouette" placeholder="Silhouette" value={form.silhouette} onChange={handleChange} />
      <input type="text" name="taille" placeholder="Taille" value={form.taille} onChange={handleChange} />
      <input type="text" name="origines" placeholder="Origines" value={form.origines} onChange={handleChange} />
      <input type="text" name="yeux" placeholder="Yeux" value={form.yeux} onChange={handleChange} />
      <input type="text" name="cheveux" placeholder="Cheveux" value={form.cheveux} onChange={handleChange} />

      <button type="submit">Enregistrer</button>
      {onClose && <button type="button" onClick={onClose}>Annuler</button>}
      {message && <p>{message}</p>}
    </form>
  );
}