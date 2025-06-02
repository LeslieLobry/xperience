"use client";
import React, { useState } from "react";
import "./recherche-sidebar.css";

export default function RechercheSidebar({ onSearch }) {
  const [form, setForm] = useState({
    pseudo: "",
    type: [],
    orientation: [],
    recherche: [],
    sexe: [],
    ageMin: "",
    ageMax: "",
    localisation: "",
    photo: false,
    description: false,
    statut: "all",
    experience: [],
    rechercheType: [],
    fumeur: [],
    silhouette: [],
    taille: [],
    origines: [],
    yeux: [],
    cheveux: [],
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
    console.log("Recherche avec :", form);
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
          {["Solo", "Couple", "Groupe"].map((opt) => (
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
          {["Hétéro", "Bi", "Lesbienne", "Gay"].map((opt) => (
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

        {/* Recherche */}
        <div className="filters-group">
          <h3>Recherche</h3>
          {["Femmes", "Hommes", "Couples", "Groupes"].map((opt) => (
            <label key={opt}>
              <input
                type="checkbox"
                name="recherche"
                value={opt}
                checked={form.recherche.includes(opt)}
                onChange={handleChange}
              />
              {opt}
            </label>
          ))}
        </div>

        {/* Sexe */}
        <div className="filters-group">
          <h3>Sexe</h3>
          {["Femme", "Homme", "Transgenre"].map((opt) => (
            <label key={opt}>
              <input
                type="checkbox"
                name="sexe"
                value={opt}
                checked={form.sexe.includes(opt)}
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

        {/* Champs supplémentaires */}
        <div className="filters-group">
          <h3>Expérience</h3>
          {["Débutant", "Curieux", "Confirmé", "Expert"].map((opt) => (
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

        <div className="filters-group">
          <h3>Type de recherche</h3>
          {["Rencontre", "Aventure", "Relation régulière", "Plan d’un soir"].map((opt) => (
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

        <div className="filters-group">
          <h3>Fumeur</h3>
          {["Non fumeur", "Fumeur occasionnel", "Fumeur régulier"].map((opt) => (
            <label key={opt}>
              <input
                type="checkbox"
                name="fumeur"
                value={opt}
                checked={form.fumeur.includes(opt)}
                onChange={handleChange}
              />
              {opt}
            </label>
          ))}
        </div>

        <div className="filters-group">
          <h3>Silhouette</h3>
          {["Fine", "Mince", "Sportive", "Ronde", "Pulpeuse"].map((opt) => (
            <label key={opt}>
              <input
                type="checkbox"
                name="silhouette"
                value={opt}
                checked={form.silhouette.includes(opt)}
                onChange={handleChange}
              />
              {opt}
            </label>
          ))}
        </div>

        <div className="filters-group">
          <h3>Taille</h3>
          {["< 1m60", "1m60–1m70", "1m70–1m80", "> 1m80"].map((opt) => (
            <label key={opt}>
              <input
                type="checkbox"
                name="taille"
                value={opt}
                checked={form.taille.includes(opt)}
                onChange={handleChange}
              />
              {opt}
            </label>
          ))}
        </div>

        <div className="filters-group">
          <h3>Origines</h3>
          {["Européenne", "Africaine", "Maghrébine", "Asiatique", "Autre"].map((opt) => (
            <label key={opt}>
              <input
                type="checkbox"
                name="origines"
                value={opt}
                checked={form.origines.includes(opt)}
                onChange={handleChange}
              />
              {opt}
            </label>
          ))}
        </div>

        <div className="filters-group">
          <h3>Yeux</h3>
          {["Bleus", "Marron", "Verts", "Noirs"].map((opt) => (
            <label key={opt}>
              <input
                type="checkbox"
                name="yeux"
                value={opt}
                checked={form.yeux.includes(opt)}
                onChange={handleChange}
              />
              {opt}
            </label>
          ))}
        </div>

        <div className="filters-group">
          <h3>Cheveux</h3>
          {["Blonds", "Bruns", "Noirs", "Roux", "Chauve"].map((opt) => (
            <label key={opt}>
              <input
                type="checkbox"
                name="cheveux"
                value={opt}
                checked={form.cheveux.includes(opt)}
                onChange={handleChange}
              />
              {opt}
            </label>
          ))}
        </div>

        <button type="submit" className="recherche-button">
          Rechercher
        </button>
      </form>
    </aside>
  );
}