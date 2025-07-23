'use client';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
        // 👉 extrait seulement la clé S3 si l'API renvoie des objets {url}
        setImages(Array.isArray(article.images) ? article.images.map(img => typeof img === "string" ? img : img.url) : []);
      } else {
        alert("Article introuvable.");
        router.push("/admin/blog");
      }
    }

    fetchArticle();
  }, [id, router]);

  // Gestion de l'upload d'image : on push la clé S3 reçue (jamais une URL complète)
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
        // on reçoit normalement { success: true, path: "articles/uuid.jpg" }
        uploaded.push(data.path);
      } else {
        alert("Erreur lors du téléchargement d'une image.");
      }
    }

    setImages((prev) => [...prev, ...uploaded]);
  };

  // Suppression d'image (clé S3)
  const handleRemoveImage = async (key) => {
    const confirmDelete = confirm("Supprimer cette image ?");
    if (!confirmDelete) return;

    const res = await fetch("/api/delete-article-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });

    if (res.ok) {
      setImages((prev) => prev.filter((img) => img !== key));
    } else {
      alert("Erreur lors de la suppression.");
    }
  };

  // Envoi des infos au backend (tableau de clés S3 !)
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

  // Pour l'aperçu, on peut faire la presign côté client comme pour partenaires (version rapide ci-dessous)
  function ArticlePresignedImg({ s3Key, ...props }) {
    const [url, setUrl] = useState(null);
    useEffect(() => {
      if (!s3Key) return setUrl("/default.jpg");
      if (s3Key.startsWith("http")) return setUrl(s3Key);
      fetch("/api/photos/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: s3Key }),
      })
        .then(res => res.json())
        .then(data => setUrl(data.url || "/default.jpg"))
        .catch(() => setUrl("/default.jpg"));
    }, [s3Key]);
    return (
      <img
        src={url || "/default.jpg"}
        alt={props.alt || "aperçu"}
        className="preview-image"
        style={{
          maxWidth: "200px",
          maxHeight: "150px",
          borderRadius: "8px",
          objectFit: "cover",
          ...props.style,
        }}
        width={200}
        height={150}
      />
    );
  }

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
          {images.map((key, index) => (
            <div key={key || index} className="image-wrapper">
              <ArticlePresignedImg s3Key={key} alt={`Image ${index}`} />
              <button
                type="button"
                className="remove-image-btn"
                onClick={() => handleRemoveImage(key)}
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
