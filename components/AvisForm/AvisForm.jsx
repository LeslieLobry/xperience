'use client';

import { useState } from "react";

export default function AvisForm({ cibleId }) {
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
      });

      if (res.ok) {
        setSuccess(true);
        setCommentaire("");
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Une erreur est survenue.");
      }
    } catch (err) {
      setError("Impossible de soumettre l'avis. Veuillez réessayer.");
    }
  };

  return (
    <div className="avis-form">
      <h3>Laisser un avis</h3>
      {success && <p className="success">Merci pour votre avis !</p>}
      {error && <p className="error">{error}</p>}

      <form onSubmit={handleSubmit}>
        <label>Commentaire :</label>
        <textarea
          placeholder="Votre message..."
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          required
        />
        <button type="submit">Envoyer</button>
      </form>
    </div>
  );
}
