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
    enLigne: false,
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
    onSearch?.(form); // envoie les données au parent
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
          <label>
            <input
              type="checkbox"
              name="enLigne"
              checked={form.enLigne}
              onChange={handleChange}
            />
            En ligne
          </label>
        </div>

        <button type="submit" className="recherche-button">
          Rechercher
        </button>
      </form>
    </aside>
  );
}
