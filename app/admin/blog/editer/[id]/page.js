'use client';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import "./edit.css";

export default function EditArticlePage() {
  const { id } = useParams();
  const router = useRouter();
  const [titre, setTitre] = useState("");
  const [contenu, setContenu] = useState("");

  useEffect(() => {
    async function fetchArticle() {
      const res = await fetch(`/api/articles/${id}`);
      if (res.ok) {
        const article = await res.json();
        setTitre(article.titre);
        setContenu(article.contenu);
      } else {
        alert("Article introuvable.");
        router.push("/admin/blog");
      }
    }

    fetchArticle();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch(`/api/articles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titre, contenu }),
    });

    if (res.ok) {
      router.push("/admin/blog");
    } else {
      alert("Erreur lors de la mise à jour.");
    }
  };

  return (
    <div className="edit-container">
      <h1>Éditer l'article</h1>
      <form className="edit-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="Titre"
          required
        />
        <textarea
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          placeholder="Contenu (HTML autorisé)"
          required
        />
        <button type="submit">Enregistrer</button>
      </form>
    </div>
  );
}
