"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import "./AvisForm.css";

export default function AvisForm({ cibleId, onCommentaireEnvoye }) {
  const [commentaire, setCommentaire] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loadingConv, setLoadingConv] = useState(false);

  const router = useRouter();

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
        if (onCommentaireEnvoye) onCommentaireEnvoye();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Une erreur est survenue.");
      }
    } catch (err) {
      setError("Impossible de publier la recommandation. Veuillez réessayer.");
    }
  };

  const goToConversation = async () => {
    try {
      setLoadingConv(true);
      setError("");

      const res = await fetch("/api/conversations/get-or-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ cibleId }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || "Impossible d’ouvrir la conversation.");
        return;
      }

      if (!data?.conversationId) {
        setError("Conversation introuvable.");
        return;
      }

      router.push(`/messagerie?conversationId=${data.conversationId}`);
    } catch (e) {
      setError("Impossible d’ouvrir la conversation.");
    } finally {
      setLoadingConv(false);
    }
  };

  return (
    <div className="avis-form">
      <h3>Écrire une recommandation</h3>

      <p className="avis-hint">
        Cette recommandation sera visible publiquement sur le profil.
        <br />
        Pour envoyer un message privé :
        {" "}
        <button
          type="button"
          onClick={goToConversation}
          className="private-message-btn"
          disabled={loadingConv}
          aria-label="Ouvrir la conversation"
        >
          {loadingConv ? "Ouverture..." : "✉️ Message privé"}
        </button>
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