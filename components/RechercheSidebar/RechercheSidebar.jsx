"use client";
import React, { useState } from "react";
import "./recherche-sidebar.css";

export default function RechercheSidebar({ onSearch }) {
  const [form, setForm] = useState({
    pseudo: "",
    type: [],
    orientation: [],
    rechercheType: [],
    ageMin: "",
    ageMax: "",
    localisation: "",
    photo: false,
    description: false,
    statut: "all",
    experience: [],
    fumeur: [],
    silhouette: [],
    taille: [],
    origines: [],
    yeux: [],
    cheveux: [],
    recherches: [],
    envies: []
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox" && Array.isArray(form[name])) {
      setForm((prev) => {
        const newValues = checked
          ? [...prev[name], value]
          : prev[name].filter((v) => v !== value);
        return { ...prev, [name]: newValues };
      });
    } else if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch?.(form);
  };

  return (
    <aside className="recherche-sidebar">
      <h2>Recherche</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="pseudo"
          placeholder="Pseudo"
          value={form.pseudo}
          onChange={handleChange}
        />

        {/* Type */}
        <div className="filters-group">
          <h3>Type</h3>
          {["Homme", "Femme", "Couple", "Groupe"].map((opt) => (
            <label key={opt}>
              <input
                type="checkbox"
                name="type"
                value={opt}
                checked={form.type.includes(opt)}
                onChange={handleChange}
              />
              {opt}
            </label>
          ))}
        </div>

        {/* Orientation */}
        <div className="filters-group">
          <h3>Orientation</h3>
          {["Hétéro", "Bi", "Pan", "Ouvert"].map((opt) => (
            <label key={opt}>
              <input
                type="checkbox"
                name="orientation"
                value={opt}
                checked={form.orientation.includes(opt)}
                onChange={handleChange}
              />
              {opt}
            </label>
          ))}
        </div>

        {/* Type de recherche */}
        <div className="filters-group">
          <h3>Type de recherche</h3>
          {["Je le garde pour moi", "Virtuel uniquement", "Virtuel et peut-être plus", "Réel seulement", "Réel & Virtuel", "Je ne sais pas, c’est à voir", "Aventure d’un soir", "Relation secrète", "Relation à long terme"].map((opt) => (
            <label key={opt}>
              <input
                type="checkbox"
                name="rechercheType"
                value={opt}
                checked={form.rechercheType.includes(opt)}
                onChange={handleChange}
              />
              {opt}
            </label>
          ))}
        </div>

        {/* Recherches */}
        <div className="filters-group">
          <h3>Je recherche</h3>
          {["Hommes hétéros", "Femmes hétéros", "Couples hétéros", "Couples F Bi", "Couples H Bi", "Couples Bi", "Hommes Bi", "Gays", "Femmes Bi", "Lesbiennes", "Travestis", "Transgenres"].map((opt) => (
            <label key={opt}>
              <input
                type="checkbox"
                name="recherches"
                value={opt}
                checked={form.recherches.includes(opt)}
                onChange={handleChange}
              />
              {opt}
            </label>
          ))}
        </div>

        {/* Envies */}
        <div className="filters-group">
          <h3>Mes envies</h3>
          {["2+2", "BDSM", "Cam", "Candualisme", "Chat", "Côte-à-côtisme", "Curieux", "Duo", "Echangisme", "Exhibition", "Extreme", "Feeling", "Fétichisme", "Gang bang", "Hard", "Mélangisme", "Papouilles", "Photos", "Pluralité", "Scénario", "Soft", "Trio", "Vidéos", "Voyeurisme"].map((opt) => (
            <label key={opt}>
              <input
                type="checkbox"
                name="envies"
                value={opt}
                checked={form.envies.includes(opt)}
                onChange={handleChange}
              />
              {opt}
            </label>
          ))}
        </div>

        {/* Expérience */}
        <div className="filters-group">
          <h3>Expérience</h3>
          {["A découvrir", "Débutant", "Occasionnel", "Expérimenté", "Je la garde pour moi"].map((opt) => (
            <label key={opt}>
              <input
                type="checkbox"
                name="experience"
                value={opt}
                checked={form.experience.includes(opt)}
                onChange={handleChange}
              />
              {opt}
            </label>
          ))}
        </div>

        {/* Âge */}
        <div className="filters-group">
          <h3>Âge</h3>
          <div className="age-inputs">
            <input
              type="number"
              name="ageMin"
              placeholder="Min"
              value={form.ageMin}
              onChange={handleChange}
              min={18}
            />
            <input
              type="number"
              name="ageMax"
              placeholder="Max"
              value={form.ageMax}
              onChange={handleChange}
              min={18}
            />
          </div>
        </div>

        {/* Localisation */}
        <div className="filters-group">
          <h3>Localisation</h3>
          <input
            type="text"
            name="localisation"
            placeholder="Ville"
            value={form.localisation}
            onChange={handleChange}
          />
        </div>

        {/* Divers */}
        <div className="filters-group">
          <label>
            <input
              type="checkbox"
              name="photo"
              checked={form.photo}
              onChange={handleChange}
            />
            Avec photo
          </label>
          <label>
            <input
              type="checkbox"
              name="description"
              checked={form.description}
              onChange={handleChange}
            />
            Avec description
          </label>
        </div>

        {/* Statut */}
        <div className="filters-group">
          <h3>Statut</h3>
          <label>
            <input
              type="radio"
              name="statut"
              value="all"
              checked={form.statut === "all"}
              onChange={handleChange}
            />
            Tous les profils
          </label>
          <label>
            <input
              type="radio"
              name="statut"
              value="en_ligne"
              checked={form.statut === "en_ligne"}
              onChange={handleChange}
            />
            Uniquement en ligne
          </label>
        </div>

        <button type="submit" className="recherche-button">
          Rechercher
        </button>
      </form>
    </aside>
  );
}
