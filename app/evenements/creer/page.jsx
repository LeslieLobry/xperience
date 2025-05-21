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

  useEffect(() => {
    if (!user || user.role !== "ADMIN") {
      router.push("/evenements");
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
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
      <input name="lieu" placeholder="Lieu" onChange={handleChange} required />

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
