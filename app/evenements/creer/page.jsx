"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import "./creer.css"
import Button from "../../../components/Button/Button";

export default function CreateEventPage() {
  const router = useRouter();
  const { user } = useAuth();

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
  });

  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [lieuInput, setLieuInput] = useState("");
  const [citySuggestions, setCitySuggestions] = useState([]);

  useEffect(() => {
    if (!user || user.role !== "ADMIN") {
      router.push("/evenements");
    }
  }, [user]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData();
    for (const key in form) {
      formData.append(key, form[key]);
    }
    if (imageFile) {
      formData.append("image", imageFile);
    }

    try {
      const res = await fetch("/api/evenements", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        router.push("/evenements");
      } else {
        let data;
        try {
          data = await res.json();
        } catch {
          data = { error: "Erreur inconnue du serveur" };
        }
        setError(data.error || "Erreur lors de la création");
      }
    } catch (err) {
      setError("Erreur réseau");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchCities = async (query) => {
    if (!query) return setCitySuggestions([]);
    try {
      const res = await fetch(
        `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(query)}&fields=nom&boost=population&limit=5`
      );
      const data = await res.json();
      setCitySuggestions(data.map((v) => v.nom));
    } catch (err) {
      console.error("Erreur geo.api.gouv.fr :", err);
      setCitySuggestions([]);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchCities(lieuInput);
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [lieuInput]);

  const handleCitySelect = (city) => {
    setForm((prev) => ({ ...prev, lieu: city }));
    setLieuInput(city);
    setCitySuggestions([]);
  };
const generateHeureOptions = () => {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const heure = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      options.push(heure);
    }
  }
  return options;
};

  return (
    <div className="creer-contenant">
      <h2 className="creer-title">Créer un événement</h2>

    <form onSubmit={handleSubmit} encType="multipart/form-data" className="event-form">
      {error && <p className="error-message">{error}</p>}

      <input name="titre" placeholder="Titre" onChange={handleChange} required />
      <textarea name="description" placeholder="Description" onChange={handleChange} className="creer-description" required />
      <input name="date" type="date" onChange={handleChange} required className="filtre-date"/>
      <select name="heureDebut" onChange={handleChange} value={form.heureDebut} required>
  <option value="">Heure de début</option>
  {generateHeureOptions().map((heure) => (
    <option key={heure} value={heure}>{heure}</option>
  ))}
  </select>
  <select name="heureFin" onChange={handleChange} value={form.heureFin} required>
    <option value="">Heure de fin</option>
    {generateHeureOptions().map((heure) => (
      <option key={heure} value={heure}>{heure}</option>
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
          <ul className="city-suggestions">
            {citySuggestions.map((city) => (
              <li key={city} onClick={() => handleCitySelect(city)}>
                {city}
              </li>
            ))}
          </ul>
        )}
      </div>

      <input name="tarifCouple" placeholder="Tarif couple (€)" type="number" onChange={handleChange} />
      <input name="tarifFemme" placeholder="Tarif femme (€)" type="number" onChange={handleChange} />
      <input name="tarifHomme" placeholder="Tarif homme (€)" type="number" onChange={handleChange} />

      <input type="file" accept="image/*" onChange={handleImageChange} />
      {previewUrl && <img src={previewUrl} alt="Aperçu" className="image-preview" />}

      {/* <select name="type" onChange={handleChange} value={form.type}>
        <option value="club">Soirée club</option>
        <option value="privée">Soirée privée</option>
      </select> */}

      <select name="acces" onChange={handleChange} value={form.acces} className="acces-select">
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
    <Button
  title="← Retour"
  onClick={() => router.push("/evenements")}
  color="#8c6a5d"
  className="filtre-btn"
  style={{ marginBottom: "1rem" }}
/>
    </div>
  );
}
