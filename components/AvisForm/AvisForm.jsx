"use client";

import { useState } from "react";
import "./AvisForm.css";

export default function AvisForm({ cibleId, onCommentaireEnvoye, onStartConversation }) {
  const [commentaire, setCommentaire] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/avis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cibleId, commentaire }),
        credentials: "include",
      });

      if (res.ok) {
        setSuccess(true);
        setCommentaire("");
        if (onCommentaireEnvoye) onCommentaireEnvoye();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Une erreur est survenue.");
      }
    } catch (err) {
      setError("Impossible de publier la recommandation. Veuillez réessayer.");
    }
  };

  return (
    <div className="avis-form">
      <h3>Écrire une recommandation</h3>

      <p className="avis-hint">
        Cette recommandation sera visible publiquement sur le profil.
        <br />
        Pour envoyer un message privé, cliquez sur{" "}
        <button
          type="button"
          className="private-message-btn"
          onClick={onStartConversation}
        >
          ✉️ l’enveloppe
        </button>
        .
      </p>

      {success && <p className="success">Merci pour votre recommandation !</p>}
      {error && <p className="error">{error}</p>}

      <form onSubmit={handleSubmit} className="form-css">
        <textarea
          placeholder="Votre recommandation..."
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          required
        />
        <button type="submit">Publier la recommandation</button>
      </form>
    </div>
  );
}