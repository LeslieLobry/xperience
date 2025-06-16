"use client";
import { useState } from "react";
import "./admin-newsletter.css"; // 👉 crée ce fichier ou adapte le chemin si tu préfères un style global

export default function AdminNewsletterPage() {
  const [titre, setTitre] = useState("");
  const [contenu, setContenu] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch("/api/admin/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titre, contenu }),
    });

    const data = await res.json();
    if (data.success) {
      setMessage("✅ Newsletter envoyée !");
      setTitre("");
      setContenu("");
    } else {
      setMessage("❌ Erreur : " + data.error);
    }
  };

  return (
    <div className="admin-newsletter-container">
      <h1>Nouvelle Newsletter</h1>
      <form onSubmit={handleSubmit} className="admin-newsletter-form">
        <input
          type="text"
          placeholder="Titre de la newsletter"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          required
        />
        <textarea
          placeholder="Contenu HTML ou texte brut"
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          rows={10}
          required
        />
        <button type="submit">Envoyer à tous les abonnés</button>
        {message && <p className="admin-newsletter-message">{message}</p>}
      </form>
    </div>
  );
}
