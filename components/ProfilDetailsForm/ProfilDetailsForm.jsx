'use client';

import { useState, useEffect, useRef } from "react";
import "../ProfilDetailsForm/ProfilDetailsForm.css";

export default function ProfilDetailsForm({ onClose, editable = true }) {
  const [form, setForm] = useState({
    localisation: "",
    experience: "",
    rechercheType: "",
    sexe: "",
    age: "",
    dateNaissance: "",
    fumeur: "",
    silhouette: "",
    taille: "",
    origines: "",
    yeux: "",
    cheveux: "",
  });

  const [message, setMessage] = useState("");
  const [localisationInput, setLocalisationInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const debounceTimeout = useRef(null);

  useEffect(() => {
    async function fetchData() {
      const res = await fetch("/api/me", { credentials: "include" });
      const data = await res.json();
      if (res.ok && data.user) {
        setForm((prev) => ({ ...prev, ...data.user }));
        setLocalisationInput(data.user.localisation || "");
      }
    }
    fetchData();
  }, []);

  const handleChange = (e) => {
    if (!editable) return;
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLocalisationChange = (e) => {
    const value = e.target.value;
    setLocalisationInput(value);
    setForm((prev) => ({ ...prev, localisation: value }));

    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    if (value.length >= 2) {
      debounceTimeout.current = setTimeout(async () => {
        try {
          const res = await fetch(
            `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(
              value
            )}&fields=nom&boost=population&limit=5`
          );
          const data = await res.json();
          const villes = data.map((v) => v.nom);
          setSuggestions(villes);
        } catch (err) {
          console.error("Erreur geo.api.gouv.fr :", err);
          setSuggestions([]);
        }
      }, 300);
    } else {
      setSuggestions([]);
    }
  };

  const handleVilleSelect = (ville) => {
    setForm((prev) => ({ ...prev, localisation: ville }));
    setLocalisationInput(ville);
    setSuggestions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editable) return;

    const res = await fetch("/api/update-profil", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setMessage("Profil mis à jour ✅");
      if (onClose) onClose();
    } else {
      setMessage("Erreur lors de l'enregistrement.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="profil-form">
      <h2>Modifier mon profil</h2>

      <div style={{ position: "relative" }}>
        <input
          type="text"
          name="localisation"
          placeholder="Ville"
          value={localisationInput}
          onChange={handleLocalisationChange}
          disabled={!editable}
        />
        {suggestions.length > 0 && editable && (
          <ul className="suggestions">
            {suggestions.map((ville, i) => (
              <li key={i} onClick={() => handleVilleSelect(ville)}>
                {ville}
              </li>
            ))}
          </ul>
        )}
      </div>

      <label htmlFor="experience">Expérience</label>
      <select
        name="experience"
        id="experience"
        value={form.experience}
        onChange={handleChange}
        disabled={!editable}
      >
        <option value="">Expérience</option>
        <option value="A découvrir">A découvrir</option>
        <option value="Débutant">Débutant</option>
        <option value="Occasionnel">Occasionnelle</option>
        <option value="Expérimenté">Expérimenté</option>
        <option value="Je la garde pour moi">Je la garde pour moi</option>
      </select>

      <label htmlFor="rechercheType">Type de recherche</label>
      <select
        id="rechercheType"
        name="rechercheType"
        value={form.rechercheType}
        onChange={handleChange}
        disabled={!editable}
      >
        <option value="">Type de recherche</option>
        <option value="Je le garde pour moi">Je le garde pour moi</option>
        <option value="Virtuel uniquement">Virtuel uniquement</option>
        <option value="Virtuel et peut-être plus">Virtuel et peut-être plus</option>
        <option value="Réel seulement">Réel seulement</option>
        <option value="Réel & Virtuel">Réel & Virtuel</option>
        <option value="Je ne sais pas, c’est à voir">Je ne sais pas, c’est à voir</option>
        <option value="Aventure d’un soir">Aventure d’un soir</option>
        <option value="Relation secrète">Relation secrète</option>
        <option value="Relation à long terme">Relation à long terme</option>
      </select>

    <label htmlFor="sexe">Sexe</label>
<select
  id="sexe"
  name="sexe"
  value={form.sexe}
  onChange={handleChange}
  disabled={!editable}
>
  <option value="">Sélectionner</option>
  <option value="Homme">Homme</option>
  <option value="Femme">Femme</option>
  <option value="Couple">Couple</option>
  <option value="Autre">Autre</option>
</select>


      <input
        type="number"
        name="age"
        placeholder="Âge"
        value={form.age}
        onChange={handleChange}
        disabled={!editable}
      />

      <input
        type="date"
        name="dateNaissance"
        placeholder="Date de naissance"
        value={form.dateNaissance}
        onChange={handleChange}
        disabled={!editable}
      />

      <label htmlFor="fumeur">Fumeur</label>
      <select
        id="fumeur"
        name="fumeur"
        value={form.fumeur}
        onChange={handleChange}
        disabled={!editable}
      >
        <option value="">Sélectionner</option>
        <option value="Non fumeur">Non fumeur</option>
        <option value="De temps en temps">De temps en temps</option>
        <option value="Fumeur">Fumeur</option>
        <option value="Vapoteur">Vapoteur</option>
      </select>

      <label htmlFor="silhouette">Silhouette</label>
      <select
        id="silhouette"
        name="silhouette"
        value={form.silhouette}
        onChange={handleChange}
        disabled={!editable}
      >
        <option value="">Sélectionner</option>
        <option value="Mince">Mince</option>
        <option value="Athlétique">Athlétique</option>
        <option value="Dans la moyenne">Dans la moyenne</option>
        <option value="Quelques rondeurs">Quelques rondeurs</option>
        <option value="Rond(e)">Rond(e)</option>
      </select>

      <input
        type="number"
        id="taille"
        name="taille"
        placeholder="Taille en cm"
        min="130"
        max="220"
        value={form.taille}
        onChange={handleChange}
        disabled={!editable}
      />

      <label htmlFor="origines">Origines</label>
      <select
        id="origines"
        name="origines"
        value={form.origines}
        onChange={handleChange}
        disabled={!editable}
      >
        <option value="">Sélectionner</option>
        <option value="Caucasien(ne)">Caucasien(ne)</option>
        <option value="Africain(e)">Africain(e)</option>
        <option value="Arabe">Arabe</option>
        <option value="Asiatique">Asiatique</option>
        <option value="Latine">Latine</option>
        <option value="Autre">Autre</option>
        <option value="Je le garde pour moi">Je le garde pour moi</option>
        <option value="Caribéen(ne)">Caribéen(ne)</option>
      </select>

      <label htmlFor="yeux">Yeux</label>
      <select
        id="yeux"
        name="yeux"
        value={form.yeux}
        onChange={handleChange}
        disabled={!editable}
      >
        <option value="">Sélectionner</option>
        <option value="Marron">Marron</option>
        <option value="Verts">Verts</option>
        <option value="Bleus">Bleus</option>
        <option value="Noirs">Noirs</option>
      </select>

      <label htmlFor="cheveux">Cheveux</label>
      <select
        id="cheveux"
        name="cheveux"
        value={form.cheveux}
        onChange={handleChange}
        disabled={!editable}
      >
        <option value="">Sélectionner</option>
        <option value="Bruns">Bruns</option>
        <option value="Châtains">Châtains</option>
        <option value="Blonds">Blonds</option>
        <option value="Roux">Roux</option>
        <option value="Poivre et sel">Poivre et sel</option>
        <option value="Chauve">Chauve</option>
        <option value="Crâne rasé">Crâne rasé</option>
      </select>

      {editable && (
        <div className="form-actions">
          <button type="submit">Enregistrer</button>
          {onClose && <button type="button" onClick={onClose}>Annuler</button>}
        </div>
      )}

      {message && <p>{message}</p>}
    </form>
  );
}
