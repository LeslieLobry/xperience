"use client";

import { useState, useEffect } from "react";
import Button from "../Button/Button";
import "./FormEvenement.css";

export default function FormEvenement({
  initialValues = {},
  onSuccess, // Appelée après succès (optionnel)
  titre = "Créer un événement",
}) {
  const [dates, setDates] = useState(initialValues.dates || [""]);
  const [form, setForm] = useState({
    titre: "",
    description: "",
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

  const [latitude, setLatitude] = useState(initialValues.latitude || "");
  const [longitude, setLongitude] = useState(initialValues.longitude || "");
  const [pays, setPays] = useState(initialValues.pays || "France");

  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(initialValues.imageUrl || "");
  const [lieuInput, setLieuInput] = useState(initialValues.lieu || "");
  const [citySuggestions, setCitySuggestions] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm((prev) => ({ ...prev, ...initialValues }));
    setPreviewUrl(initialValues.imageUrl || "");
    setLieuInput(initialValues.lieu || "");
    setLatitude(initialValues.latitude || "");
    setLongitude(initialValues.longitude || "");
    setPays(initialValues.pays || "France");
    setDates(initialValues.dates || [""]);
  }, [initialValues]);

  // Autocomplétion villes avec géoloc
  useEffect(() => {
    if (!lieuInput || lieuInput.length < 2) return setCitySuggestions([]);
    const delayDebounce = setTimeout(() => {
      if (pays === "France") {
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
      } else if (pays === "Belgium") {
        fetch(
          `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(
            lieuInput
          )}&country=Belgium&format=json&limit=5`
        )
          .then((res) => res.json())
          .then((data) =>
            setCitySuggestions(
              data.map((v) => ({
                nom: v.display_name,
                lat: v.lat,
                lon: v.lon,
              }))
            )
          )
          .catch(() => setCitySuggestions([]));
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [lieuInput, pays]);

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

  const handleCitySelect = (city) => {
    setForm((prev) => ({
      ...prev,
      lieu: pays === "France" ? city.nom : city.nom.split(",")[0],
      pays: pays,
    }));
    setLieuInput(pays === "France" ? city.nom : city.nom.split(",")[0]);
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

  // Soumission avec FormData POST
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("titre", form.titre);
      formData.append("description", form.description);
      formData.append("lieu", form.lieu);
      formData.append("type", form.type);
      formData.append("acces", form.acces);
      formData.append("heureDebut", form.heureDebut);
      formData.append("heureFin", form.heureFin);
      formData.append("latitude", latitude);
      formData.append("longitude", longitude);
      formData.append("pays", pays);
      formData.append("lien", form.lien || "");
      formData.append("tarifCouple", form.tarifCouple || "");
      formData.append("tarifFemme", form.tarifFemme || "");
      formData.append("tarifHomme", form.tarifHomme || "");
      // Dates
      const nonEmptyDates = dates.filter(Boolean);
      if (nonEmptyDates.length === 1) {
        formData.append("date", nonEmptyDates[0]);
      } else {
        nonEmptyDates.forEach((d) => formData.append("dates[]", d));
      }
      // Image
      if (imageFile) formData.append("image", imageFile);

      const res = await fetch("/api/evenements", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur serveur");
      }

      setIsSubmitting(false);
      setError("");
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message);
      setIsSubmitting(false);
    }
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

        {/* Sélecteur de pays */}
        <select
          name="pays"
          value={pays}
          onChange={e => setPays(e.target.value)}
          style={{ marginBottom: 8 }}
        >
          <option value="France">France</option>
          <option value="Belgium">Belgique</option>
        </select>

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

        {/* MULTI-DATES */}
        <label>Dates de l'événement</label>
        {dates.map((date, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              name={`date-${idx}`}
              type="date"
              value={date}
              onChange={e => {
                const newDates = [...dates];
                newDates[idx] = e.target.value;
                setDates(newDates);
              }}
              required
              className="filtre-date"
              style={{ marginBottom: 4 }}
            />
            {dates.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setDates(dates.filter((_, i) => i !== idx));
                }}
                style={{
                  background: "none",
                  border: "none",
                  fontWeight: "bold",
                  color: "#c54",
                  cursor: "pointer",
                  fontSize: "1.2em"
                }}
                title="Supprimer cette date"
              >✕</button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setDates([...dates, ""])}
          style={{
            background: "#e0c084",
            border: "none",
            padding: "0.2em 0.8em",
            borderRadius: 4,
            marginBottom: 10,
            cursor: "pointer",
            fontWeight: 500
          }}
        >
          + Ajouter une date
        </button>
        {/* FIN MULTI-DATES */}

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
                  {pays === "France"
                    ? city.nom
                    : city.nom.split(",")[0]}
                </li>
              ))}
            </ul>
          )}
        </div>

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
