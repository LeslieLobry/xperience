'use client';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import "./edit.css";

export default function EditArticlePage() {
  const { id } = useParams();
  const router = useRouter();

  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [contenu, setContenu] = useState("");
  const [images, setImages] = useState([]);

  useEffect(() => {
    async function fetchArticle() {
      const res = await fetch(`/api/articles/${id}`);
      if (res.ok) {
        const article = await res.json();
        setTitre(article.titre);
        setDescription(article.description || "");
        setContenu(article.contenu);
        setImages(article.images || []);
      } else {
        alert("Article introuvable.");
        router.push("/admin/blog");
      }
    }

    fetchArticle();
  }, [id, router]);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    const uploaded = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/upload-article-image", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        uploaded.push(data.imageUrl);
      } else {
        alert("Erreur lors du téléchargement d&apos;une image.");
      }
    }

    setImages((prev) => [...prev, ...uploaded]);
  };

  const handleRemoveImage = async (url) => {
    const confirmDelete = confirm("Supprimer cette image ?");
    if (!confirmDelete) return;

    const res = await fetch("/api/delete-article-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (res.ok) {
      setImages((prev) => prev.filter((img) => img !== url));
    } else {
      alert("Erreur lors de la suppression.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch(`/api/articles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titre, description, contenu, images }),
    });

    if (res.ok) {
      router.push("/admin/blog");
    } else {
      alert("Erreur lors de la mise à jour.");
    }
  };

  return (
    <div className="edit-container">
      <h1>Éditer l&apos;article</h1>
      <form className="edit-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="Titre"
          required
        />

        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brève description"
        />

        <textarea
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          placeholder="Contenu (HTML autorisé)"
          required
        />

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
        />

        <div className="image-preview">
          {images.map((url, index) => (
            <div key={index} className="image-wrapper">
              <Image
                src={url}
                alt={`Image ${index}`}
                width={200}
                height={150}
                className="preview-image"
              />
              <button
                type="button"
                className="remove-image-btn"
                onClick={() => handleRemoveImage(url)}
              >
                ❌
              </button>
            </div>
          ))}
        </div>

        <button type="submit">Enregistrer</button>
      </form>
    </div>
  );
}
