'use client';

import { useState } from "react";

export default function AvisCard({ avis, connectedUserId, onRefresh }) {
  const [isEditing, setIsEditing] = useState(false);
  const [commentaire, setCommentaire] = useState(avis.commentaire);
  const [loading, setLoading] = useState(false);

  const isAuteur = connectedUserId === avis.auteurId;

  const handleDelete = async () => {
    if (!confirm("Supprimer cet avis ?")) return;

    setLoading(true);
    const res = await fetch(`/api/avis/${avis.id}`, { method: "DELETE" });

    if (res.ok && onRefresh) {
      onRefresh(); // Pour rafraîchir la liste des avis
    }
  };

  const handleEdit = async () => {
    if (!commentaire.trim()) return;

    setLoading(true);
    const res = await fetch(`/api/avis/${avis.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentaire }),
    });

    if (res.ok) {
      setIsEditing(false);
      if (onRefresh) onRefresh();
    }
  };

  return (
    <div className="avis-card">
      <div className="avis-header">
        <img src={avis.auteur.photoUrl || "/default.jpg"} alt="avatar" className="avis-avatar" />
        <strong>{avis.auteur.pseudo}</strong>
      </div>

      {isEditing ? (
        <div className="avis-edit">
          <textarea
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            disabled={loading}
          />
          <button onClick={handleEdit} disabled={loading}>Enregistrer</button>
          <button onClick={() => setIsEditing(false)} disabled={loading}>Annuler</button>
        </div>
      ) : (
        <p className="avis-commentaire">{avis.commentaire}</p>
      )}

      {isAuteur && !isEditing && (
        <div className="avis-actions">
          <button onClick={() => setIsEditing(true)}>Modifier</button>
          <button onClick={handleDelete} disabled={loading}>Supprimer</button>
        </div>
      )}
    </div>
  );
}
