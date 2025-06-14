'use client';

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import "../../app/reinitialiser/reinitialiser.css";

export default function ReinitialiserClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("form");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (data.success) {
        setStatus("success");
        setTimeout(() => router.push("/connexion"), 3000);
      } else {
        setStatus("invalid");
        setError(data.message || "Lien invalide.");
      }
    } catch (err) {
      setStatus("invalid");
      setError("Erreur serveur.");
    }
  };

  if (status === "invalid") {
    return (
      <div className="reset-message-container">
        <h1>❌ Lien invalide ou expiré</h1>
        <p>Veuillez faire une nouvelle demande de réinitialisation.</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="reset-message-container">
        <h1>✅ Mot de passe mis à jour</h1>
        <p>Redirection vers la connexion...</p>
      </div>
    );
  }

  return (
    <div className="reset-container">
      <h1 className="reset-title">Réinitialiser le mot de passe</h1>
      <form onSubmit={handleSubmit} className="reset-form">
        <input
          type="password"
          placeholder="Nouveau mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="reset-input"
        />
        <input
          type="password"
          placeholder="Confirmer le mot de passe"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="reset-input"
        />
        <button type="submit" className="reset-button">Valider</button>
      </form>
      {error && <p className="reset-error">{error}</p>}
    </div>
  );
}
