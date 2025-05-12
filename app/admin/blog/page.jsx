'use client';

import { useEffect, useState } from "react";
import "./adminBlog.css";

export default function AdminBlogPage() {
  const [articles, setArticles] = useState([]);
  const [titre, setTitre] = useState("");
  const [contenu, setContenu] = useState("");
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess("");
    setError("");

    const res = await fetch("/api/articles/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titre, contenu }),
    });

    if (res.ok) {
      setTitre("");
      setContenu("");
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
        <textarea
          placeholder="Contenu (HTML autorisé)"
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          required
        />
        <button type="submit">Publier</button>
      </form>

      <h2>Articles existants</h2>
      <ul className="admin-list">
        {articles.map((article) => (
          <li key={article.id}>
            <span>{article.titre}</span>
            <div className="admin-buttons">
              <button onClick={() => handleDelete(article.id)}>🗑️ Supprimer</button>
              <a href={`/admin/blog/editer/${article.id}`} className="edit-link">✏️ Éditer</a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
