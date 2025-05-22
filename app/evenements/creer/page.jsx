"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";

export default function CreateEventPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [form, setForm] = useState({
    titre: "",
    description: "",
    date: "",
    lieu: "",
    type: "club",
    acces: "femmes_couples",
  });

  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");

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

    const formData = new FormData();
    for (const key in form) {
      formData.append(key, form[key]);
    }
    if (imageFile) {
      formData.append("image", imageFile);
    }

    const res = await fetch("/api/events", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      router.push("/evenements");
    } else {
      const data = await res.json();
      setError(data.error || "Erreur lors de la création");
    }
  };

  // 🔍 Récupération des villes
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
    const fullCity = city;
    setForm((prev) => ({ ...prev, lieu: fullCity }));
    setLieuInput(fullCity);
    setCitySuggestions([]);
  };

  return (
    <form
      onSubmit={handleSubmit}
      encType="multipart/form-data"
      style={{
        maxWidth: "500px",
        margin: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        padding: "2rem",
      }}
    >
      <h2>Créer un événement</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <input name="titre" placeholder="Titre" onChange={handleChange} required />
      <textarea name="description" placeholder="Description" onChange={handleChange} required />
      <input name="date" type="date" onChange={handleChange} required />

      {/* Champ Lieu avec autocomplétion */}
      <div style={{ position: "relative" }}>
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
          <ul
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              zIndex: 10,
              background: "#fff",
              border: "1px solid #ccc",
              maxHeight: "150px",
              overflowY: "auto",
              listStyle: "none",
              padding: 0,
              margin: 0,
            }}
          >
            {citySuggestions.map((city) => (
              <li
                key={city.id}
                style={{ padding: "0.5rem", cursor: "pointer" }}
                onClick={() => handleCitySelect(city)}
              >
                {city}
              </li>
            ))}
          </ul>
        )}
      </div>

      <input type="file" accept="image/*" onChange={handleImageChange} />
      {previewUrl && (
        <img
          src={previewUrl}
          alt="Aperçu"
          style={{ maxWidth: "100%", borderRadius: "4px" }}
        />
      )}

      <select name="type" onChange={handleChange} value={form.type}>
        <option value="club">Soirée club</option>
        <option value="privée">Soirée privée</option>
      </select>

      <select name="acces" onChange={handleChange} value={form.acces}>
        <option value="femmes_couples">Femmes et couples</option>
        <option value="hommes">Hommes seuls acceptés</option>
      </select>

      <button type="submit">Valider</button>
    </form>
  );
}
