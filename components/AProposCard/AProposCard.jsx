'use client';

export default function AProposCard({ createdAt, lastLogin }) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
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
