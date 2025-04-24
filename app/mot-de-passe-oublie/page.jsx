"use client";
import "../mot-de-passe-oublie/mdp.css"
import { useState } from "react";

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage("Un lien de réinitialisation a été envoyé si cet email est valide.");
      } else {
        setError(data.message || "Une erreur est survenue.");
      }
    } catch (err) {
      setError("Erreur serveur.");
    }
  };

  return (
    <div className="motdepasse-container">
      <h1 className="motdepasse-title">Mot de passe oublié</h1>
      <p className="motdepasse-description">
        Entrez votre adresse email pour recevoir un lien de réinitialisation.
      </p>
      <form onSubmit={handleSubmit} className="motdepasse-form">
        <input
          type="email"
          placeholder="Votre email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="motdepasse-input"
        />
        <button type="submit" className="motdepasse-button">
          Envoyer
        </button>
      </form>
      {message && <p className="motdepasse-message success">{message}</p>}
      {error && <p className="motdepasse-message error">{error}</p>}
    </div>
  );
}
