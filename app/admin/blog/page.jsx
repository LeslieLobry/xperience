'use client';

import { useEffect, useState } from "react";
import "./adminBlog.css";

// Petite utilitaire : force en tableau
const asArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);

// Mini composant pour les miniatures privées S3
function PresignedImage({ s3Key, alt, className = "", ...props }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!s3Key) return setUrl("/default.jpg"); // assure-toi que /public/default.jpg existe
    fetch("/api/photos/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: s3Key }),
    })
      .then((res) => res.ok ? res.json() : Promise.resolve({ url: "/default.jpg" }))
      .then((data) => setUrl(data?.url || "/default.jpg"))
      .catch(() => setUrl("/default.jpg"));
  }, [s3Key]);

  if (!url) {
    return (
      <div
        className={className}
        style={{ width: 80, height: 80, background: "#eee", borderRadius: "6px" }}
      />
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      style={{ objectFit: "cover", width: 80, height: 80, borderRadius: "6px" }}
      {...props}
    />
  );
}

export default function AdminBlogPage() {
  const [articles, setArticles] = useState([]);   // toujours un tableau
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [contenu, setContenu] = useState("");
  const [images, setImages] = useState([]);       // clés S3
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const fetchArticles = async () => {
    try {
      const res = await fetch("/api/articles", { cache: "no-store" });
      const data = await res.json().catch(() => []);
      // Normalisation : accepte [], {items:[]}, {data:[]}, objet unique, null…
      const list =
        Array.isArray(data) ? data :
        Array.isArray(data?.items) ? data.items :
        Array.isArray(data?.data) ? data.data :
        data ? asArray(data) : [];
      setArticles(list);
    } catch {
      setArticles([]); // pas de crash si erreur réseau
    }
  };

  useEffect(() => { fetchArticles(); }, []);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    const uploaded = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/upload-article-image", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        uploaded.push(data.imageUrl || data.path || ""); // clé S3
      } else {
        alert("Erreur lors de l'upload d'une image.");
      }
    }

    setImages((prev) => [...prev, ...uploaded.filter(Boolean)]);
  };

  const handleRemoveImage = async (s3Key) => {
    try {
      await fetch("/api/delete-article-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: s3Key }),
      });
    } catch (err) {
      console.error("Erreur suppression image:", err);
    }
    setImages((prev) => prev.filter((key) => key !== s3Key));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess("");
    setError("");

    const res = await fetch("/api/articles/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titre, description, contenu, images }),
    });

    if (res.ok) {
      setTitre("");
      setDescription("");
      setContenu("");
      setImages([]);
      setSuccess("✅ Article publié !");
      fetchArticles();
    } else {
      const data = await res.json().catch(() => ({}));
      setError("❌ Échec : " + (data.message || "Erreur inconnue"));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Supprimer cet article ?")) return;
    const res = await fetch(`/api/articles/${id}`, { method: "DELETE" });
    if (res.ok) fetchArticles();
  };

  return (
    <div className="admin-container">
      <h1>Gestion du blog</h1>

      <form className="admin-form" onSubmit={handleSubmit}>
        {success && <p className="form-success">{success}</p>}
        {error && <p className="form-error">{error}</p>}

        <input
          type="text"
          placeholder="Titre"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          required
        />

        <input
          type="text"
          placeholder="Brève description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <textarea
          placeholder="Contenu HTML"
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          required
        />

        <input type="file" accept="image/*" multiple onChange={handleImageUpload} />

        <div className="image-preview">
          {asArray(images).map((key, i) => (
            <div key={`${key}-${i}`} className="image-wrapper">
              <PresignedImage s3Key={key} alt={`Aperçu ${i}`} />
              <button type="button" onClick={() => handleRemoveImage(key)}>❌</button>
            </div>
          ))}
        </div>

        <button type="submit">Publier</button>
      </form>

      <h2 className="blog-h2">Articles existants</h2>

      <div className="admin-articles">
        {asArray(articles).map((article) => {
          // essaye plusieurs formes d’images possibles
          const firstImgKey =
            asArray(article?.images)[0]?.url ||
            article?.image?.url ||
            article?.imageUrl ||
            null;

          return (
            <div className="article-card" key={article.id}>
              {firstImgKey && (
                <PresignedImage
                  s3Key={firstImgKey}
                  alt={`Image de ${article.titre}`}
                  className="article-thumbnail"
                />
              )}
              <div className="article-info">
                <h3>{article.titre}</h3>
                <div className="admin-buttons">
                  <a href={`/admin/blog/editer/${article.id}`} className="edit-link">✏️ Éditer</a>
                  <button onClick={() => handleDelete(article.id)}>🗑️ Supprimer</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
