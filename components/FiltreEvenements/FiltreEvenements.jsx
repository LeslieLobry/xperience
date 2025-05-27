"use client";

import { useState, useEffect } from "react";
import "./FiltreEvenements.css";
import Button from "../Button/Button";

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

  useEffect(() => {
    const rangeEl = document.querySelector(".filtre-range");
    if (rangeEl) {
      const percentage = ((rayon - 10) / (200 - 10)) * 100;
      rangeEl.style.background = `linear-gradient(to right, #f0d084 ${percentage}%, white ${percentage}%)`;
    }
  }, [rayon]);

  const detecterVille = async () => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLatitude(latitude);
        setLongitude(longitude);

        try {
          const res = await fetch(
            `https://geo.api.gouv.fr/communes?lat=${latitude}&lon=${longitude}&fields=nom,centre&format=json`
          );
          const data = await res.json();
          const city = data?.[0];
          if (city) {
            setLieu(city.nom);
            setLieuInput(city.nom);
            setLatitude(city.centre.coordinates[1]);
            setLongitude(city.centre.coordinates[0]);
          }
        } catch (err) {
          console.error("Erreur API Gouv :", err);
        }
      },
      () => {
        console.warn("Localisation refusée");
      }
    );
  };

  const fetchCities = async (input) => {
    if (!input || input.length < 2) {
      setCitySuggestions([]);
      return;
    }

    try {
      const res = await fetch(
        `https://geo.api.gouv.fr/communes?nom=${input}&fields=nom,centre&boost=population&limit=5`
      );
      const data = await res.json();

      const suggestions = data.map((commune) => ({
        nom: commune.nom,
        lat: commune.centre.coordinates[1],
        lon: commune.centre.coordinates[0],
      }));

      setCitySuggestions(suggestions);
    } catch (error) {
      console.error("Erreur autocomplétion :", error);
    }
  };

  const handleCitySelect = (city) => {
    setLieu(city.nom);
    setLieuInput(city.nom);
    setLatitude(city.lat);
    setLongitude(city.lon);
    setCitySuggestions([]);
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
            {citySuggestions.map((city, i) => (
              <li key={i} onClick={() => handleCitySelect(city)}>
                {city.nom}
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
          min="00"
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
            onChange={() => handleCheckbox("femmes_couples", acces, setAcces)}
          />
          Femmes et couples uniquement
        </label>
      </div>

      <Button
        title="Rechercher"
        onClick={appliquerFiltres}
        color="#e0c084"
        style={{ marginTop: "1rem" }}
        className="filtre-btn"
      />
    </aside>
  );
}
