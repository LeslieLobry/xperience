"use client";

import { useState, useEffect } from "react";
import Button from "../Button/Button";
import "./FormEvenement.css";

export default function FormEvenement({
  initialValues = {},
  onSubmit,
  isSubmitting = false,
  error = "",
  titre = "Créer un événement",
}) {
  const [form, setForm] = useState({
    titre: "",
    description: "",
    date: "",
    heureDebut: "",
    heureFin: "",
    lieu: "",
    type: "club",
    acces: "femmes_couples",
    tarifCouple: "",
    tarifFemme: "",
    tarifHomme: "",
    lien: "",
    ...initialValues,
  });

  // Ajout latitude/longitude au state
  const [latitude, setLatitude] = useState(initialValues.latitude || "");
  const [longitude, setLongitude] = useState(initialValues.longitude || "");

  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(initialValues.imageUrl || "");
  const [lieuInput, setLieuInput] = useState(initialValues.lieu || "");
  const [citySuggestions, setCitySuggestions] = useState([]);

  // Mise à jour des valeurs si initialValues change (édition)
  useEffect(() => {
    setForm((prev) => ({ ...prev, ...initialValues }));
    setPreviewUrl(initialValues.imageUrl || "");
    setLieuInput(initialValues.lieu || "");
    setLatitude(initialValues.latitude || "");
    setLongitude(initialValues.longitude || "");
  }, [initialValues]);

  // Autocomplétion villes avec géoloc
  useEffect(() => {
    if (!lieuInput) return setCitySuggestions([]);
    const delayDebounce = setTimeout(() => {
      fetch(
        `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(
          lieuInput
        )}&fields=nom,centre&boost=population&limit=5`
      )
        .then((res) => res.json())
        .then((data) =>
          setCitySuggestions(
            data.map((v) => ({
              nom: v.nom,
              lat: v.centre?.coordinates?.[1] || "",
              lon: v.centre?.coordinates?.[0] || "",
            }))
          )
        )
        .catch(() => setCitySuggestions([]));
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [lieuInput]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Quand on sélectionne une ville : on remplit aussi lat/lon
  const handleCitySelect = (city) => {
    setForm((prev) => ({ ...prev, lieu: city.nom }));
    setLieuInput(city.nom);
    setLatitude(city.lat);
    setLongitude(city.lon);
    setCitySuggestions([]);
  };

  const generateHeureOptions = () => {
    const options = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const heure = `${h.toString().padStart(2, "0")}:${m
          .toString()
          .padStart(2, "0")}`;
        options.push(heure);
      }
    }
    return options;
  };

  // Envoie la latitude/longitude au parent lors de la soumission
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      imageFile,
      latitude,
      longitude,
    });
  };

  return (
    <div className="creer-contenant">
      <h2 className="creer-title">{titre}</h2>

      <form
        onSubmit={handleSubmit}
        encType="multipart/form-data"
        className="event-form"
      >
        {error && <p className="error-message">{error}</p>}

        <input
          name="titre"
          placeholder="Titre"
          value={form.titre}
          onChange={handleChange}
          required
        />

        <textarea
          name="description"
          placeholder="Description"
          value={form.description}
          onChange={handleChange}
          className="creer-description"
          required
        />

        <input
          name="date"
          type="date"
          value={form.date}
          onChange={handleChange}
          required
          className="filtre-date"
        />

        <select
          name="heureDebut"
          onChange={handleChange}
          value={form.heureDebut}
          required
        >
          <option value="">Heure de début</option>
          {generateHeureOptions().map((heure) => (
            <option key={heure} value={heure}>
              {heure}
            </option>
          ))}
        </select>

        <select
          name="heureFin"
          onChange={handleChange}
          value={form.heureFin}
          required
        >
          <option value="">Heure de fin</option>
          {generateHeureOptions().map((heure) => (
            <option key={heure} value={heure}>
              {heure}
            </option>
          ))}
        </select>

        <div className="autocomplete-wrapper">
          <input
            name="lieu"
            placeholder="Ville"
            value={lieuInput}
            onChange={(e) => {
              setLieuInput(e.target.value);
              setForm((prev) => ({ ...prev, lieu: e.target.value }));
            }}
            autoComplete="off"
            required
          />
          {citySuggestions.length > 0 && (
            <ul>
              {citySuggestions.map((city, i) => (
                <li
                  key={city.nom + "-" + i}
                  onClick={() => handleCitySelect(city)}
                >
                  {city.nom}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Champs cachés pour latitude/longitude pour debug */}
        {/* 
        <input type="text" value={latitude} readOnly />
        <input type="text" value={longitude} readOnly /> 
        */}

        <input
          name="lien"
          placeholder="Lien vers l'événement"
          value={form.lien}
          onChange={handleChange}
        />

        <input
          name="tarifCouple"
          placeholder="Tarif couple (€)"
          type="number"
          value={form.tarifCouple}
          onChange={handleChange}
        />
        <input
          name="tarifFemme"
          placeholder="Tarif femme (€)"
          type="number"
          value={form.tarifFemme}
          onChange={handleChange}
        />
        <input
          name="tarifHomme"
          placeholder="Tarif homme (€)"
          type="number"
          value={form.tarifHomme}
          onChange={handleChange}
        />

        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
        />
        {previewUrl && (
          <img src={previewUrl} alt="Aperçu" className="image-preview" />
        )}

        <select
          name="acces"
          onChange={handleChange}
          value={form.acces}
          className="acces-select"
        >
          <option value="femmes_couples">Femmes et couples</option>
          <option value="hommes">Hommes seuls acceptés</option>
        </select>

        <Button
          title={isSubmitting ? "Envoi en cours..." : "Valider"}
          type="submit"
          disabled={isSubmitting}
          color="#e0c084"
          className="filtre-btn"
          style={{ marginTop: "1rem" }}
        />
      </form>
    </div>
  );
}
