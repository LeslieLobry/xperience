"use client";

import { useState } from "react";
import "./FiltreEvenements.css";

export default function FiltreEvenements({ onFilterChange }) {
  const today = new Date().toISOString().split("T")[0];
  const [lieu, setLieu] = useState("");
  const [lieuInput, setLieuInput] = useState("");
  const [citySuggestions, setCitySuggestions] = useState([]);

  const [rayon, setRayon] = useState(50);
  const [dateDebut, setDateDebut] = useState(today);
  const [dateFin, setDateFin] = useState(today);
  const [acces, setAcces] = useState([]);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);

  const detecterVille = async () => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLatitude(latitude);
        setLongitude(longitude);
        console.log("📍 Position GPS:", latitude, longitude);

        try {
          const response = await fetch(
            `https://wft-geo-db.p.rapidapi.com/v1/geo/locations/${latitude},${longitude}/nearbyCities?limit=1&countryIds=FR`,
            {
              headers: {
                "X-RapidAPI-Key": process.env.NEXT_PUBLIC_GEODB_API_KEY,
                "X-RapidAPI-Host": "wft-geo-db.p.rapidapi.com",
              },
            }
          );

          const data = await response.json();
          console.log("📦 Réponse GeoDB:", data);

          const city = data.data?.[0];
          if (city) {
            const full = `${city.city}, ${city.region}`;
            setLieu(full);
            setLieuInput(full);
            setLatitude(city.latitude);
            setLongitude(city.longitude);
            console.log("🏙️ Ville détectée :", full);
          } else {
            console.warn("❗ Aucune ville détectée via GeoDB.");
          }
        } catch (err) {
          console.error("🚨 Erreur API GeoDB :", err);
        }
      },
      () => {
        console.warn("❌ Localisation refusée par l'utilisateur");
      }
    );
  };

  const fetchCities = async (input) => {
    if (!input) {
      setCitySuggestions([]);
      return;
    }

    try {
      const res = await fetch(
        `https://wft-geo-db.p.rapidapi.com/v1/geo/cities?namePrefix=${input}&limit=5&languageCode=fr&countryIds=FR`,
        {
          headers: {
            "X-RapidAPI-Key": process.env.NEXT_PUBLIC_GEODB_API_KEY,
            "X-RapidAPI-Host": "wft-geo-db.p.rapidapi.com",
          },
        }
      );
      const data = await res.json();
      setCitySuggestions(data.data || []);
    } catch (error) {
      console.error("Erreur autocomplétion :", error);
    }
  };

  const handleCitySelect = (city) => {
    const full = `${city.name}, ${city.region}`;
    setLieu(full);
    setLieuInput(full);
    setLatitude(city.latitude);
    setLongitude(city.longitude);
    setCitySuggestions([]);
    console.log("✅ Ville sélectionnée manuellement :", full);
  };

  const handleLieuChange = (e) => {
    const value = e.target.value;
    setLieuInput(value);
    setLieu(value);
    fetchCities(value);
  };

  const handleCheckbox = (val, list, setList) => {
    if (list.includes(val)) {
      setList(list.filter((v) => v !== val));
    } else {
      setList([...list, val]);
    }
  };

  const appliquerFiltres = () => {
    console.log("📤 Filtres appliqués :", {
      lieu,
      rayon,
      dateDebut,
      dateFin,
      acces,
      latitude,
      longitude,
    });

    onFilterChange({
      lieu,
      rayon,
      dateDebut,
      dateFin,
      acces,
      latitude,
      longitude,
    });
  };

  return (
    <aside className="filtre-evenements">
      <div className="filtre-dates">
        <input
          type="date"
          min={today}
          value={dateDebut}
          onChange={(e) => setDateDebut(e.target.value)}
          className="filtre-date"
        />
        <input
          type="date"
          min={today}
          value={dateFin}
          onChange={(e) => setDateFin(e.target.value)}
          className="filtre-date"
        />
      </div>

      <div className="input-ville-wrapper">
        <input
          type="text"
          value={lieuInput}
          onChange={handleLieuChange}
          className="filtre-input"
          placeholder="Ville"
        />
        <button
          type="button"
          className="detecter-icone"
          onClick={detecterVille}
          title="Détecter ma ville"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="#e0c084"
            width="20"
            height="20"
          >
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
          </svg>
        </button>
        {citySuggestions.length > 0 && (
          <ul className="suggestions">
            {citySuggestions.map((city) => (
              <li key={city.id} onClick={() => handleCitySelect(city)}>
                {city.name}, {city.region}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="filtre-rayon">
        <label>
          Rayon <strong>{rayon} km</strong>
        </label>
        <input
          type="range"
          min="10"
          max="200"
          step="10"
          value={rayon}
          onChange={(e) => setRayon(parseInt(e.target.value))}
          className="filtre-range"
        />
      </div>

      <div className="filtre-access">
        <h4>Accès</h4>
        <label>
          <input
            type="checkbox"
            checked={acces.includes("hommes")}
            onChange={() => handleCheckbox("hommes", acces, setAcces)}
          />
          Hommes seuls acceptés
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={acces.includes("femmes_couples")}
            onChange={() =>
              handleCheckbox("femmes_couples", acces, setAcces)
            }
          />
          Femmes et couples uniquement
        </label>
      </div>

      <button className="filtre-btn" onClick={appliquerFiltres}>
        Rechercher
      </button>
    </aside>
  );
}
