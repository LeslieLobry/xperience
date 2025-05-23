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

  useEffect(() => {
    if (!user || user.role !== "ADMIN") {
      router.push("/evenements");
    }
  }, [user]);

  useEffect(() => {
    const fetchEvent = async () => {
      const res = await fetch(`/api/evenements?page=1&perPage=100`);
      const data = await res.json();
      const event = data.events.find((e) => e.id === parseInt(params.id));
      if (event) {
        setForm({
          titre: event.titre,
          description: event.description,
          date: event.date.split("T")[0],
          heureDebut: event.heureDebut || "",
          heureFin: event.heureFin || "",
          lieu: event.lieu,
          type: event.type,
          acces: event.acces,
          tarifCouple: event.tarifCouple || "",
          tarifFemme: event.tarifFemme || "",
          tarifHomme: event.tarifHomme || "",
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

    const res = await fetch(`/api/evenements/${params.id}`, {
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
    <form onSubmit={handleSubmit} encType="multipart/form-data" className="event-edit-form">
      <h2>Modifier un événement</h2>

      {error && <p className="error-message">{error}</p>}

      <input name="titre" value={form.titre} onChange={handleChange} required />
      <textarea name="description" value={form.description} onChange={handleChange} required />
      <input type="date" name="date" value={form.date} onChange={handleChange} required />
      <input name="heureDebut" placeholder="Heure de début (ex: 22:00)" value={form.heureDebut} onChange={handleChange} />
      <input name="heureFin" placeholder="Heure de fin (ex: 04:00)" value={form.heureFin} onChange={handleChange} />
      <input name="lieu" value={form.lieu} onChange={handleChange} required />

      <input name="tarifCouple" placeholder="Tarif couple (€)" type="number" value={form.tarifCouple} onChange={handleChange} />
      <input name="tarifFemme" placeholder="Tarif femme (€)" type="number" value={form.tarifFemme} onChange={handleChange} />
      <input name="tarifHomme" placeholder="Tarif homme (€)" type="number" value={form.tarifHomme} onChange={handleChange} />

      <input type="file" accept="image/*" onChange={handleImageChange} />
      {previewUrl && <img src={previewUrl} alt="Aperçu" className="image-preview" />}

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
