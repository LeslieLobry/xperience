"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ModifierEvenementPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();

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

  // Redirige si non admin
  useEffect(() => {
    if (!user || user.role !== "ADMIN") {
      router.push("/evenements");
    }
  }, [user]);

  // Préremplir le formulaire
  useEffect(() => {
    const fetchEvent = async () => {
      const res = await fetch(`/api/events?page=1&perPage=100`);
      const data = await res.json();
      const event = data.events.find(e => e.id === parseInt(params.id));
      if (event) {
        setForm({
          titre: event.titre,
          description: event.description,
          date: event.date.split("T")[0],
          lieu: event.lieu,
          type: event.type,
          acces: event.acces,
        });
        if (event.imageUrl) setPreviewUrl(event.imageUrl);
      } else {
        setError("Événement introuvable.");
      }
    };
    fetchEvent();
  }, [params.id]);

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

    const res = await fetch(`/api/events/${params.id}`, {
      method: "PUT",
      body: formData,
    });

    if (res.ok) {
      router.push("/admin/evenements");
    } else {
      const data = await res.json();
      setError(data.error || "Erreur lors de la modification");
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
      <h2>Modifier un événement</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <input name="titre" value={form.titre} onChange={handleChange} required />
      <textarea name="description" value={form.description} onChange={handleChange} required />
      <input type="date" name="date" value={form.date} onChange={handleChange} required />
      <input name="lieu" value={form.lieu} onChange={handleChange} required />

      <input type="file" accept="image/*" onChange={handleImageChange} />
      {previewUrl && (
        <img
          src={previewUrl}
          alt="Aperçu"
          style={{ maxWidth: "100%", borderRadius: "4px" }}
        />
      )}

      <select name="type" value={form.type} onChange={handleChange}>
        <option value="club">Soirée club</option>
        <option value="privée">Soirée privée</option>
      </select>

      <select name="acces" value={form.acces} onChange={handleChange}>
        <option value="femmes_couples">Femmes et couples</option>
        <option value="hommes">Hommes seuls acceptés</option>
      </select>

      <button type="submit">Enregistrer les modifications</button>
    </form>
  );
}
