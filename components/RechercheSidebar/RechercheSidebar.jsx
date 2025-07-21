"use client";
import React, { useState, useImperativeHandle, forwardRef } from "react";
import "./recherche-sidebar.css";
import { extraireFiltresVocal } from "../../lib/extraireFiltresVocal";
import { usePathname } from "next/navigation";
import ReconnaissanceVocale from "../ReconnaissanceVocale/ReconnaissanceVocale";
function normalizeToDb(val) {
  return val
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return isMobile;
}

// Nettoie les filtres incohérents (autourDeMoi prioritaire sur localisation)
function cleanFormFilters(formIn) {
  let form = { ...formIn };
  if (form.autourDeMoi) {
    form.localisation = "";
  } else if (form.localisation) {
    form.autourDeMoi = false;
    if (!form.rayon) delete form.rayon;
  }
  if (!form.autourDeMoi) delete form.autourDeMoi;
  return form;
}

const DEFAULT_RAYON = 20;

const RechercheSidebar = forwardRef(function RechercheSidebar({ onSearch }, ref) {
  const [form, setForm] = useState({
    pseudo: "", type: [], orientation: [], rechercheType: [],
    ageMin: "", ageMax: "", localisation: "",
    photo: false, description: false, statut: "all",
    experience: [], fumeur: [], silhouette: [],
    taille: [], origines: [], yeux: [], cheveux: [],
    recherches: [], envies: [], rayon: "", autourDeMoi: false
  });
  const [resumeVocal, setResumeVocal] = useState("");
  const [loadingGeo, setLoadingGeo] = useState(false);

  const [openSections, setOpenSections] = useState({
    identite: false,
    criteres: false,
    envies: false,
    experience: false,
    autres: false,
  });

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // --- Centralise la gestion "recherche" pour formulaire et vocal ---
const handleSearch = (formRaw) => {
  const form = cleanFormFilters(formRaw);

  // Normalise toutes les valeurs de type "choix" AVANT envoi (orientation, type, rechercheType, etc.)
  const normalizeArray = arr => (Array.isArray(arr) ? arr.map(normalizeToDb) : []);
  form.orientation = normalizeArray(form.orientation);
  form.type = normalizeArray(form.type);
  form.rechercheType = normalizeArray(form.rechercheType);
  form.recherches = normalizeArray(form.recherches);

  if (form.autourDeMoi) {
    setLoadingGeo(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        const rayon = form.rayon || DEFAULT_RAYON;
        setLoadingGeo(false);
        onSearch?.({ ...form, latitude, longitude, rayon });
      },
      (err) => {
        setLoadingGeo(false);
        alert("Impossible de récupérer ta position");
        onSearch?.(form); // fallback, sans geo
      }
    );
  } else {
    onSearch?.(form);
  }
};

  // --- Injection vocale des filtres ---
  useImperativeHandle(ref, () => ({
    handleVocalFiltres(filtres) {
      setForm((prev) => {
        const result = { ...prev };
        Object.entries(filtres).forEach(([k, v]) => {
          if (Array.isArray(result[k]) && Array.isArray(v)) {
            result[k] = [...new Set([...result[k], ...v])];
          } else {
            result[k] = v;
          }
        });
        handleSearch(result);
        return result;
      });
    }
  }));

  const isMobile = useIsMobile(768);
  const pathname = usePathname();

  if (isMobile && pathname !== "/recherche") {
    return (
      <aside className="recherche-sidebar recherche-sidebar--mobile">
        <a href="/recherche" className="go-recherche-link">
          🔎 Lancer une recherche avancée
        </a>
      </aside>
    );
  }

  // --- Handler pour le submit formulaire classique ---
  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch(form);
  };

  return (
    <aside className="recherche-sidebar">
      <h2>🔎 Recherche</h2>
      <div style={{ marginBottom: 24 }}>
        <ReconnaissanceVocale
          onResult={texte => {
            setResumeVocal(texte);
            const filtres = extraireFiltresVocal(texte);
            setForm(prev => ({ ...prev, ...filtres }));
            console.log("[Vocal] Filtres extraits:", filtres);
            handleSearch({ ...form, ...filtres });
          }}
        />
        {resumeVocal && (
          <div
            style={{
              margin: "12px 0 20px 0",
              padding: "12px 20px",
              borderRadius: 8,
              background: "#fffbe7",
              color: "#c4903a",
              fontWeight: "bold",
              fontSize: 17,
              boxShadow: "0 2px 10px #e0c08444",
              maxWidth: 700
            }}
          >
            <span style={{ opacity: 0.7 }}>Recherche vocale&nbsp;:</span> «&nbsp;{resumeVocal}&nbsp;»
          </div>
        )}
        {loadingGeo && (
          <div style={{ color: "#e0c084", fontWeight: 600, marginBottom: 8 }}>
            ⏳ Récupération de ta position...
          </div>
        )}
      </div>
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
          {renderCheckboxGroup("Orientation", "orientation", ["Hétéro", "Bi", "Pan", "Ouvert", "Lesbienne"])}
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
            "2+2", "BDSM", "Cam", "Candaulisme", "Chat", "Côte-à-côtisme", "Curieux",
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
          <input
            type="text"
            name="localisation"
            placeholder="Ville"
            value={form.localisation}
            onChange={handleChange}
          />
          <input
            type="number"
            name="rayon"
            placeholder="Rayon (km)"
            value={form.rayon}
            min={1}
            max={200}
            onChange={handleChange}
          />
          {/* Ajoute une case "autour de moi" */}
          <label>
            <input
              type="checkbox"
              name="autourDeMoi"
              checked={!!form.autourDeMoi}
              onChange={handleChange}
            />
            Autour de moi
          </label>
          <label><input type="checkbox" name="photo" checked={form.photo} onChange={handleChange} />Avec photo</label>
          <label><input type="checkbox" name="description" checked={form.description} onChange={handleChange} />Avec description</label>
          <h4>Statut</h4>
          <label><input type="radio" name="statut" value="all" checked={form.statut === "all"} onChange={handleChange} />Tous</label>
          <label><input type="radio" name="statut" value="en_ligne" checked={form.statut === "en_ligne"} onChange={handleChange} />En ligne</label>
        </Section>
        <button type="submit" className="recherche-button" disabled={loadingGeo}>
          {loadingGeo ? "Recherche..." : "Rechercher"}
        </button>
      </form>
    </aside>
  );

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    if (name === "autourDeMoi") {
      setForm((prev) => ({
        ...prev,
        autourDeMoi: checked,
        localisation: checked ? "" : prev.localisation
      }));
      return;
    }
    if (name === "localisation" && value) {
      setForm((prev) => ({
        ...prev,
        localisation: value,
        autourDeMoi: false
      }));
      return;
    }
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
  }

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
      <div className={`section-group ${open ? "open" : ""}`}>
        <h3 onClick={toggle} className="section-toggle">
          {open ? "−" : "+"} {title}
        </h3>
        {open && <div className="section-content">{children}</div>}
      </div>
    );
  }
});

export default RechercheSidebar;
