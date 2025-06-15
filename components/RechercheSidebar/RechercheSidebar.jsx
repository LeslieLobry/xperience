"use client";
import React, { useState } from "react";
import "./recherche-sidebar.css";

export default function RechercheSidebar({ onSearch }) {
  const [form, setForm] = useState({
    pseudo: "", type: [], orientation: [], rechercheType: [],
    ageMin: "", ageMax: "", localisation: "",
    photo: false, description: false, statut: "all",
    experience: [], fumeur: [], silhouette: [],
    taille: [], origines: [], yeux: [], cheveux: [],
    recherches: [], envies: []
  });

  const [openSections, setOpenSections] = useState({
    identite: true,
    criteres: false,
    envies: false,
    experience: false,
    autres: false,
  });

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox" && Array.isArray(form[name])) {
      setForm((prev) => ({
        ...prev,
        [name]: checked ? [...prev[name], value] : prev[name].filter((v) => v !== value),
      }));
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
      <h2>🔎 Recherche</h2>
      <form onSubmit={handleSubmit}>
        {/* PSEUDO */}
        <input
          type="text"
          name="pseudo"
          className="input-recherche"
          placeholder="Pseudo"
          value={form.pseudo}
          onChange={handleChange}
        />

        {/* IDENTITÉ */}
        <Section title="Identité" open={openSections.identite} toggle={() => toggleSection("identite")}>
          {renderCheckboxGroup("Type", "type", ["Homme", "Femme", "Couple", "Groupe"])}
          {renderCheckboxGroup("Orientation", "orientation", ["Hétéro", "Bi", "Pan", "Ouvert"])}
          {renderCheckboxGroup("Type de recherche", "rechercheType", [
            "Je le garde pour moi", "Virtuel uniquement", "Virtuel et peut-être plus",
            "Réel seulement", "Réel & Virtuel", "Je ne sais pas, c’est à voir",
            "Aventure d’un soir", "Relation secrète", "Relation à long terme",
          ])}
        </Section>

        {/* CRITÈRES */}
        <Section title="Recherches" open={openSections.criteres} toggle={() => toggleSection("criteres")}>
          {renderCheckboxGroup("Je recherche", "recherches", [
            "Hommes hétéros", "Femmes hétéros", "Couples hétéros", "Couples F Bi",
            "Couples H Bi", "Couples Bi", "Hommes Bi", "Gays", "Femmes Bi",
            "Lesbiennes", "Travestis", "Transgenres",
          ])}
        </Section>

        {/* ENVIES */}
        <Section title="Envies" open={openSections.envies} toggle={() => toggleSection("envies")}>
          {renderCheckboxGroup("Mes envies", "envies", [
            "2+2", "BDSM", "Cam", "Candualisme", "Chat", "Côte-à-côtisme", "Curieux",
            "Duo", "Echangisme", "Exhibition", "Extreme", "Feeling", "Fétichisme",
            "Gang bang", "Hard", "Mélangisme", "Papouilles", "Photos", "Pluralité",
            "Scénario", "Soft", "Trio", "Vidéos", "Voyeurisme"
          ])}
        </Section>

        {/* EXPÉRIENCE */}
        <Section title="Expérience" open={openSections.experience} toggle={() => toggleSection("experience")}>
          {renderCheckboxGroup("Expérience", "experience", [
            "A découvrir", "Débutant", "Occasionnel", "Expérimenté", "Je la garde pour moi"
          ])}
        </Section>

        {/* AUTRES */}
        <Section title="Autres critères" open={openSections.autres} toggle={() => toggleSection("autres")}>
          <div className="filters-group">
            <h4>Âge</h4>
            <input type="number" name="ageMin" placeholder="Min" value={form.ageMin} onChange={handleChange} min={18} />
            <input type="number" name="ageMax" placeholder="Max" value={form.ageMax} onChange={handleChange} min={18} />
          </div>
          <input type="text" name="localisation" placeholder="Ville" value={form.localisation} onChange={handleChange} />
          <label><input type="checkbox" name="photo" checked={form.photo} onChange={handleChange} />Avec photo</label>
          <label><input type="checkbox" name="description" checked={form.description} onChange={handleChange} />Avec description</label>
          <h4>Statut</h4>
          <label><input type="radio" name="statut" value="all" checked={form.statut === "all"} onChange={handleChange} />Tous</label>
          <label><input type="radio" name="statut" value="en_ligne" checked={form.statut === "en_ligne"} onChange={handleChange} />En ligne</label>
        </Section>

        <button type="submit" className="recherche-button">Rechercher</button>
      </form>
    </aside>
  );

  function renderCheckboxGroup(title, name, options) {
    return (
      <div className="filters-group">
        <h4>{title}</h4>
        {options.map((opt) => (
          <label key={opt}>
            <input
              type="checkbox"
              name={name}
              value={opt}
              checked={form[name]?.includes(opt)}
              onChange={handleChange}
            />
            {opt}
          </label>
        ))}
      </div>
    );
  }

  function Section({ title, open, toggle, children }) {
    return (
      <div className="section-group">
        <h3 onClick={toggle} className="section-toggle">
          {open ? "−" : "+"} {title}
        </h3>
        {open && <div className="section-content">{children}</div>}
      </div>
    );
  }
}
