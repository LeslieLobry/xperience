"use client";
import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useRef,
} from "react";
import "./recherche-sidebar.css";
import { extraireFiltresVocal } from "../../lib/extraireFiltresVocal";
import { usePathname } from "next/navigation";
import ReconnaissanceVocale from "../ReconnaissanceVocale/ReconnaissanceVocale";

/* -------------------------------- Utils -------------------------------- */
function normalizeToDb(val) {
  return val.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return isMobile;
}

const DEFAULT_RAYON = 20;

/* --------------------------- Autocomplétion ville --------------------------- */
function useCityAutocomplete() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const controllerRef = useRef(null);
  const debounceRef = useRef(null);

  // Pour éviter de lancer la recherche au milieu d’un accent (IME)
  const composingRef = useRef(false);

  useEffect(() => {
    if (composingRef.current) return; // ne pas requêter pendant la composition IME

    if (!query || query.trim().length < 2) {
      setItems([]);
      setOpen(false);
      setHighlight(-1);
      return;
    }

    setLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        controllerRef.current?.abort?.();
        controllerRef.current = new AbortController();

        const url =
          `https://geo.api.gouv.fr/communes` +
          `?nom=${encodeURIComponent(query.trim())}` +
          `&fields=nom,code,centre,departement,population` +
          `&boost=population&limit=8`;

        const res = await fetch(url, { signal: controllerRef.current.signal });
        const data = await res.json();

        const mapped = (Array.isArray(data) ? data : []).map((c) => ({
          label: `${c.nom} (${c.departement?.code || "—"})`,
          nom: c.nom,
          code: c.code,
          departement: c.departement?.code || "",
          latitude: c.centre?.coordinates?.[1] ?? null,
          longitude: c.centre?.coordinates?.[0] ?? null,
          population: c.population ?? 0,
        }));

        setItems(mapped);
        setOpen(mapped.length > 0);
        setHighlight(mapped.length ? 0 : -1);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      clearTimeout(debounceRef.current);
      controllerRef.current?.abort?.();
    };
  }, [query]);

  return {
    query,
    setQuery,
    items,
    loading,
    open,
    setOpen,
    highlight,
    setHighlight,
    composingRef,
  };
}

/* ------------------------------ Clean filters ------------------------------ */
// ⚠️ Règle demandée : si une "localisation" (ville) existe → PAS de latitude/longitude.
function cleanFormFilters(formIn) {
  const form = { ...formIn };

  if (form.autourDeMoi) {
    form.localisation = "";
    delete form.latitude;
    delete form.longitude;
    if (!form.rayon) form.rayon = DEFAULT_RAYON;
  } else if (form.localisation && String(form.localisation).trim().length) {
    form.autourDeMoi = false;
    delete form.latitude;   // 🔥 on retire systématiquement
    delete form.longitude;  // 🔥 on retire systématiquement
    if (!form.rayon) delete form.rayon;
  } else {
    delete form.latitude;
    delete form.longitude;
    delete form.rayon;
  }

  if (!form.autourDeMoi) delete form.autourDeMoi;

  return form;
}

/* --------------------------- Helper: géocodage (optionnel) ---------------------------
   Tu peux l'utiliser pour un usage interne (stats, suggestion, etc.).
   Ici, on ne remontera JAMAIS lat/lng vers l'URL parent si une ville est présente. */
async function geocodeCityByName(name) {
  const q = String(name || "").trim();
  if (!q) return null;
  const plain = q.replace(/\s*\([\dA-Za-z\-]+\)\s*$/, "");
  const url =
    `https://geo.api.gouv.fr/communes` +
    `?nom=${encodeURIComponent(plain)}` +
    `&fields=nom,code,centre,departement,population` +
    `&boost=population&limit=1`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const c = Array.isArray(data) && data[0];
    if (!c) return null;
    return {
      nom: c.nom,
      dep: c.departement?.code || "",
      lat: c.centre?.coordinates?.[1] ?? null,
      lng: c.centre?.coordinates?.[0] ?? null,
      population: c.population ?? 0,
    };
  } catch {
    return null;
  }
}

/* ================================ Component ================================ */
const RechercheSidebar = forwardRef(function RechercheSidebar(
  { onSearch, className },
  ref
) {
  const pathname = usePathname();

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
    envies: [],
    rayon: "",
    autourDeMoi: false,
    latitude: undefined,
    longitude: undefined,
  });

  // Texte brut tapé pour la ville (séparé de form.localisation)
  const [cityText, setCityText] = useState("");

  // FIX: on suit si l’utilisateur est en train d’écrire dans l’input ville
  const cityEditingRef = useRef(false);               // FIX: flag édition
  const cityEditingTimeoutRef = useRef(null);         // FIX: anti-rafale

  useEffect(() => {
    // FIX: n’écrase PAS la frappe si on est en cours d’édition
    if (cityEditingRef.current) return;               // FIX
    setCityText(form.localisation || "");
  }, [form.localisation]);

  const [resumeVocal, setResumeVocal] = useState("");
  const [loadingGeo, setLoadingGeo] = useState(false);

  const [openSections, setOpenSections] = useState({
    identite: false,
    envies: false,
    experience: false,
    autres: false,
  });
  const toggleSection = (key) =>
    setOpenSections((p) => ({ ...p, [key]: !p[key] }));

  /* ----------------------------- Autocomplétion ----------------------------- */
  const city = useCityAutocomplete();
  const dropdownRef = useRef(null);
  const cityInputRef = useRef(null);

  // Fermer le menu si clic dehors
  useEffect(() => {
    function onDocClick(e) {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target)) city.setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [city]);

  function selectCity(item) {
    // On remplit l’étiquette lisible
    const label = `${item.nom} (${item.departement || "—"})`;
    setForm((prev) => ({
      ...prev,
      localisation: label,
      autourDeMoi: false,
      // On invalide volontairement les coords pour respecter la règle "ville seule"
      latitude: undefined,
      longitude: undefined,
    }));
    setCityText(label);
    city.setQuery(item.nom);
    city.setOpen(false);
    // garder le focus pour continuer à taper si besoin
    // FIX: on sort explicitement du mode édition (plus de blocage du useEffect)
    cityEditingRef.current = false;                   // FIX
    setTimeout(() => cityInputRef.current?.focus(), 0);
  }

  function onCityKeyDown(e) {
    if (!city.open || !city.items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      city.setHighlight((i) => (i + 1) % city.items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      city.setHighlight((i) => (i - 1 + city.items.length) % city.items.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = city.items[city.highlight] || city.items[0];
      if (item) selectCity(item);
    } else if (e.key === "Escape") {
      city.setOpen(false);
    }
  }

  /* ------------------------------ Recherche push ------------------------------ */
  const handleSearch = async (formRaw) => {
    // 1) Exclusivité des modes
    const raw = { ...formRaw };
    if (raw.autourDeMoi) {
      raw.localisation = "";
      raw.latitude = undefined;
      raw.longitude = undefined;
    } else if (raw.localisation?.trim()) {
      raw.autourDeMoi = false;
      // 🔥 ville seule => on purge coords ici aussi
      raw.latitude = undefined;
      raw.longitude = undefined;
    } else {
      raw.latitude = undefined;
      raw.longitude = undefined;
    }

    // 2) Nettoyage/normalisation
    const f = cleanFormFilters(raw);
    const normalizeArray = (arr) =>
      Array.isArray(arr) ? arr.map(normalizeToDb) : [];
    f.orientation = normalizeArray(f.orientation);
    f.type = normalizeArray(f.type);
    f.rechercheType = normalizeArray(f.rechercheType);
    f.recherches = normalizeArray(f.recherches);
    f.experience = normalizeArray(f.experience);
    f.fumeur = normalizeArray(f.fumeur);
    f.silhouette = normalizeArray(f.silhouette);
    f.taille = normalizeArray(f.taille);
    f.origines = normalizeArray(f.origines);
    f.yeux = normalizeArray(f.yeux);
    f.cheveux = normalizeArray(f.cheveux);
    f.envies = normalizeArray(f.envies);

    // 3) Autour de moi : calcule coords via geoloc (sans les mettre dans l’URL)
    if (f.autourDeMoi) {
      setLoadingGeo(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLoadingGeo(false);
          onSearch?.({
            ...f,
            // on passe au parent pour la requête, mais il ne devra pas les garder en URL
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            rayon: Number(f.rayon || DEFAULT_RAYON),
            localisation: "",
          });
        },
        () => {
          setLoadingGeo(false);
          alert("Impossible de récupérer ta position");
          onSearch?.(f);
        }
      );
      return;
    }

    // 4) Branche "Ville" — URL = ville (+ rayon), JAMAIS de coords
    const candidateCity = (f.localisation || cityText || "").trim();
    if (candidateCity) {
      f.localisation = candidateCity;
      f.rayon = Number(f.rayon || DEFAULT_RAYON);
      f.autourDeMoi = false;
      delete f.latitude;
      delete f.longitude;
      onSearch?.(f);
      return;
    }

    // 5) Global
    onSearch?.(f);
  };

  useImperativeHandle(ref, () => ({
    handleVocalFiltres(filtres) {
      setForm((prev) => {
        let next = { ...prev };
        Object.entries(filtres).forEach(([k, v]) => {
          if (Array.isArray(next[k]) && Array.isArray(v)) {
            next[k] = [...new Set([...next[k], ...v])];
          } else {
            next[k] = v;
          }
        });

        // Si la voix a mis une ville texte → on purge coords
        if (next.localisation) {
          delete next.latitude;
          delete next.longitude;
        }
        setCityText(next.localisation || "");
        handleSearch(next);
        return next;
      });
    },
  }));

  const isMobile = useIsMobile(768);

  // Lien simplifié sur mobile en dehors de /recherche
  if (isMobile && pathname !== "/recherche") {
    return (
      <aside className="recherche-sidebar recherche-sidebar--mobile">
        <a href="/recherche" className="go-recherche-link">
          🔎 Lancer une recherche avancée
        </a>
      </aside>
    );
  }

  function handleSubmit(e) {
    e.preventDefault();
    handleSearch(form);
  }

  /* ---------------------------------- JSX ---------------------------------- */
  return (
    <aside className={`recherche-sidebar ${className || ""}`}>
      <div style={{ marginBottom: 24 }}>
        <ReconnaissanceVocale
          onResult={async (texte) => {
            setResumeVocal(texte);
            let filtres = {};
            try {
              filtres = extraireFiltresVocal(texte) || {};
            } catch {}
            let next = { ...form, ...filtres };

            // Si la voix a saisi une ville → on enlève coords pour l’URL propre
            const villeVoix =
              next.localisation || next.ville || next.city || next.commune;
            if (villeVoix) {
              delete next.latitude;
              delete next.longitude;
              next.autourDeMoi = false;
              next.rayon = next.rayon || DEFAULT_RAYON;
            }

            setForm(next);
            setCityText(next.localisation || "");
            handleSearch(next);
          }}
        />

        {resumeVocal && (
          <div
            style={{
              margin: "12px 0 20px",
              padding: "6px",
              borderRadius: 8,
              background: "#fffbe7",
              color: "#c4903a",
              fontWeight: "bold",
              boxShadow: "0 2px 10px #e0c08444",
              maxWidth: 700,
            }}
          >
            <span style={{ opacity: 0.7 }}>Recherche vocale :</span> « {resumeVocal} »
          </div>
        )}

        {loadingGeo && (
          <div style={{ color: "#e0c084", fontWeight: 600, marginBottom: 8 }}>
            ⏳ Récupération de ta position...
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="pseudo"
          className="input-recherche"
          placeholder="Pseudo"
          value={form.pseudo}
          onChange={handleChange}
        />

        <Section
          title="Identité"
          open={openSections.identite}
          toggle={() => toggleSection("identite")}
        >
          {renderCheckboxGroup("Type", "type", [
            "Homme",
            "Femme",
            "Couple",
            "Groupe",
          ])}
          {renderCheckboxGroup("Orientation", "orientation", [
            "Hétéro",
            "Bi",
            "Pan",
            "Ouvert",
            "Lesbienne",
          ])}
          {renderCheckboxGroup("Type de recherche", "rechercheType", [
            "Je le garde pour moi",
            "Virtuel uniquement",
            "Virtuel et peut-être plus",
            "Réel seulement",
            "Réel & virtuel",
            "Je ne sais pas, c’est à voir",
            "Aventure d’un soir",
            "Relation secrète",
            "Relation à long terme",
          ])}
        </Section>

        <Section
          title="Envies"
          open={openSections.envies}
          toggle={() => toggleSection("envies")}
        >
          {renderCheckboxGroup("Mes envies", "envies", [
            "2+2",
            "BDSM",
            "Cam",
            "Candaulisme",
            "Chat",
            "Côte-à-côtisme",
            "Curieux",
            "Duo",
            "Echangisme",
            "Exhibition",
            "Extreme",
            "Feeling",
            "Fétichisme",
            "Gang bang",
            "Hard",
            "Mélangisme",
            "Papouilles",
            "Photos",
            "Pluralité",
            "Scénario",
            "Soft",
            "Trio",
            "Vidéos",
            "Voyeurisme",
          ])}
        </Section>

        <Section
          title="Expérience"
          open={openSections.experience}
          toggle={() => toggleSection("experience")}
        >
          {renderCheckboxGroup("Expérience", "experience", [
            "A découvrir",
            "Débutant",
            "Occasionnel",
            "Expérimenté",
            "Je la garde pour moi",
          ])}
        </Section>

        <Section
          title="Autres critères"
          open={openSections.autres}
          toggle={() => toggleSection("autres")}
        >
          <div className="filters-group">
            <h4>Âge</h4>
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

          {/* --- Autocomplétion Ville --- */}
          <div
            className="filters-group"
            ref={dropdownRef}
            style={{ position: "relative" }}
          >
            <h4>Ville</h4>
            <input
              type="text"
              name="localisation"
              className="input-recherche"
              placeholder="Commune (ex: Paris)"
              value={cityText}
              autoComplete="off"
              autoCorrect="off"
              ref={cityInputRef}
              onFocus={() => {
                if (city.items.length) city.setOpen(true);
              }}
              onCompositionStart={() => {
                city.composingRef.current = true;
              }}
              onCompositionEnd={(e) => {
                city.composingRef.current = false;
                // Re-déclenche la recherche avec le texte finalisé
                const v = e.currentTarget.value;
                city.setQuery(v);
                if (v.trim().length >= 2 && city.items.length) {
                  city.setOpen(true);
                }
              }}
              onChange={(e) => {
                const v = e.target.value;

                // FIX: on signale qu’on édite, pour empêcher le useEffect d’écraser la frappe
                cityEditingRef.current = true;                     // FIX
                clearTimeout(cityEditingTimeoutRef.current);        // FIX
                cityEditingTimeoutRef.current = setTimeout(() => {  // FIX
                  cityEditingRef.current = false;
                }, 250);

                setCityText(v); // texte affiché
                setForm((prev) => ({
                  ...prev,
                  localisation: v, // on aligne directement : plus naturel pour l’URL
                  autourDeMoi: false,
                  latitude: undefined,   // 🔥 invalide coords
                  longitude: undefined,  // 🔥 invalide coords
                }));
                if (!city.composingRef.current) {
                  city.setQuery(v);
                  city.setOpen(v.trim().length >= 2);
                }
              }}
              onKeyDown={onCityKeyDown}
            />
            {city.loading && <div className="city-hint">Recherche…</div>}
            {city.open && city.items.length > 0 && (
              <ul
                className="city-dropdown"
                tabIndex={-1}
                // Empêche la perte de focus & clic hasardeux
                onMouseDown={(e) => e.preventDefault()}
              >
                {city.items.map((item, idx) => (
                  <li
                    key={`${item.code}-${idx}`}
                    className={`city-option ${
                      idx === city.highlight ? "is-active" : ""
                    }`}
                    onMouseEnter={() => city.setHighlight(idx)}
                    onClick={() => selectCity(item)}
                    title={`Pop. ${item.population.toLocaleString("fr-FR")}`}
                  >
                    <span className="city-name">{item.label}</span>
                    {item.latitude != null && item.longitude != null && (
                      <span className="city-geo">
                        · {item.latitude.toFixed(3)}, {item.longitude.toFixed(3)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <input
            type="number"
            name="rayon"
            placeholder="Rayon (km)"
            value={form.rayon}
            min={1}
            max={200}
            onChange={handleChange}
          />

          <label>
            <input
              type="checkbox"
              name="autourDeMoi"
              checked={form.autourDeMoi}
              onChange={handleChange}
            />
            Autour de moi
          </label>

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

          <h4>Statut</h4>
          <label>
            <input
              type="radio"
              name="statut"
              value="all"
              checked={form.statut === "all"}
              onChange={handleChange}
            />
            Tous
          </label>
          <label>
            <input
              type="radio"
              name="statut"
              value="en_ligne"
              checked={form.statut === "en_ligne"}
              onChange={handleChange}
            />
            En ligne
          </label>

          {renderCheckboxGroup("Silhouette", "silhouette", [
            "Mince",
            "Moyenne",
            "Rond",
            "Ronde",
            "Athlétique",
            "Sportif",
            "Pulpeuse",
            "Normal",
          ])}
          {renderCheckboxGroup("Taille", "taille", [
            "Petite",
            "Petit",
            "Moyenne",
            "Grande",
            "Grand",
          ])}
          {renderCheckboxGroup("Origines", "origines", [
            "Européen",
            "Maghrébin",
            "Africain",
            "Asiatique",
            "Métisse",
            "Autre",
          ])}
          {renderCheckboxGroup("Yeux", "yeux", [
            "Bleu",
            "Vert",
            "Marron",
            "Noir",
            "Gris",
            "Noisette",
          ])}
          {renderCheckboxGroup("Cheveux", "cheveux", [
            "Blond",
            "Brun",
            "Noir",
            "Roux",
            "Châtain",
            "Gris",
            "Rasé",
            "Long",
            "Court",
          ])}
        </Section>

        <button type="submit" className="recherche-button" disabled={loadingGeo}>
          {loadingGeo ? "Recherche..." : "Rechercher"}
        </button>
      </form>
    </aside>
  );

  /* -------------------------------- Handlers -------------------------------- */
  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    if (name === "autourDeMoi") {
      setForm((prev) => ({
        ...prev,
        autourDeMoi: checked,
        localisation: checked ? "" : prev.localisation,
        latitude: undefined,
        longitude: undefined,
      }));
      if (checked) {
        city.setOpen(false);
        setCityText("");
      }
      return;
    }

    if (name === "localisation") {
      // géré dans l’onChange de l’input ville ci-dessus
      return;
    }

    if (type === "checkbox" && Array.isArray(form[name])) {
      setForm((prev) => ({
        ...prev,
        [name]: checked
          ? [...prev[name], value]
          : prev[name].filter((v) => v !== value),
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
              checked={Array.isArray(form[name]) ? form[name]?.includes(opt) : false}
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
