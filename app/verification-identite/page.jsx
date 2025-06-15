"use client";

import { useState } from "react";
import "./VerificationIdentite.css";

export default function VerificationIdentitePage() {
  const [loading, setLoading] = useState(false);

  const handleStartVerification = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/verification/stripe-session", {
        method: "POST",
      });

      const data = await res.json();

      if (data?.url) {
        window.location.href = data.url; // ✅ Redirection vers Stripe
      } else {
        alert(data?.error || "Une erreur est survenue.");
      }
    } catch (err) {
      console.error("Erreur lors du démarrage de la vérification :", err);
      alert("Impossible de lancer la vérification.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="verif-identite-container">
      <h1>Vérification d’identité</h1>
      <p>
        Pour continuer à utiliser pleinement le site, merci de vérifier votre identité.
        Cette vérification est rapide, sécurisée, et effectuée via Stripe.
      </p>
      <button onClick={handleStartVerification} disabled={loading}>
        {loading ? "Redirection en cours..." : "Démarrer la vérification"}
      </button>
    </div>
  );
}
