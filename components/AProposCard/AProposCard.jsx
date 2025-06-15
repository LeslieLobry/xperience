'use client';
import "../AProposCard/AProposCard.css";

export default function AProposCard({ createdAt, lastLogin }) {
  const formatDate = (dateString) => {
    if (!dateString) return "Non disponible";
    const date = new Date(dateString);
    return isNaN(date) ? "Date invalide" : date.toLocaleDateString("fr-FR");
  };

  return (
    <div className="a-propos-card">
      <h3>A propos</h3>
      <p>
        📅 Date d'inscription : <strong>{formatDate(createdAt)}</strong>
      </p>
      <p>
        📡 Dernière connexion : <strong>{formatDate(lastLogin)}</strong>
      </p>
    </div>
  );
}
