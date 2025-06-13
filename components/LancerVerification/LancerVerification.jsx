'use client';
import { useState } from 'react';

export default function LancerVerification() {
  const [loading, setLoading] = useState(false);

  const startVerification = async () => {
    setLoading(true);
    const res = await fetch('/api/verify', { method: 'POST' });
    const data = await res.json();
    setLoading(false);
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert("Erreur lors du démarrage de la vérification.");
    }
  };

  return (
    <button onClick={startVerification} disabled={loading}>
      {loading ? "Chargement..." : "Vérifier mon identité"}
    </button>
  );
}
