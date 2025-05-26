'use client';

import { useEffect, useState } from "react";
import "./adminBlog.css";

export default function AdminBlogPage() {
  const [articles, setArticles] = useState([]);
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [contenu, setContenu] = useState("");
  const [images, setImages] = useState([]);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const fetchArticles = async () => {
    const res = await fetch("/api/articles");
    const data = await res.json();
    setArticles(data);
  };

  useEffect(() => {
    fetchArticles();
  }, []);

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
        alert("Erreur lors de l'upload d'une image.");
      }
    }

    setImages((prev) => [...prev, ...uploaded]);
  };

  const handleRemoveImage = (urlToDelete) => {
    setImages((prev) => prev.filter((url) => url !== urlToDelete));
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
      const data = await res.json();
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

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
        />

        <div className="image-preview">
          {images.map((url, i) => (
            <div key={i} className="image-wrapper">
              <img src={url} alt={`Aperçu ${i}`} />
              <button type="button" onClick={() => handleRemoveImage(url)}>
                ❌
              </button>
            </div>
          ))}
        </div>

        <button type="submit">Publier</button>
      </form>

      <h2 className="blog-h2">Articles existants</h2>
      <div className="admin-articles">
        {articles.map((article) => (
          <div className="article-card" key={article.id}>
            {article.images?.[0] && (
              <img
                src={article.images[0].url}
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
        ))}
      </div>
    </div>
  );
}
