"use client";

import { useState } from "react";
import Image from "next/image";
import Button from "../Button/Button";

import "./AvisCard.css";

export default function AvisCard({ avis, connectedUserId, onRefresh }) {
  const [isEditing, setIsEditing] = useState(false);
  const [commentaire, setCommentaire] = useState(avis.commentaire);
  const [loading, setLoading] = useState(false);

  const isAuteur = connectedUserId === avis.auteurId;



  const handleDelete = async () => {
    if (!confirm("Supprimer cet avis ?")) return;
    setLoading(true);
    const res = await fetch(`/api/avis/${avis.id}`, { method: "DELETE" });
    if (res.ok && onRefresh) onRefresh();
    setLoading(false);
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
    setLoading(false);
  };

  return (
    <article className="avis-card">
      <header className="avis-header">
        {/* <Image
          src={photoUrl || "/default.jpg"}
          alt={`Avatar de ${avis.auteur.pseudo}`}
          width={24}
          height={24}
          className="avis-avatar"
        /> */}
        <strong className="avis-author">{avis.auteur.pseudo}:</strong>
      </header>
      {isEditing ? (
        <div className="avis-edit">
          <textarea
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            disabled={loading}
            className="avis-textarea"
          />
          <div className="avis-edit-actions">
            <Button title="Enregistrer" onClick={handleEdit} disabled={loading} />
            <Button
              title="Annuler"
              onClick={() => {
                setCommentaire(avis.commentaire);
                setIsEditing(false);
              }}
              variant="ghost"
              disabled={loading}
            />
          </div>
        </div>
      ) : (
        <p className="avis-commentaire">{avis.commentaire}</p>
      )}

      {isAuteur && !isEditing && (
        <footer className="avis-footer">
          <Button
            title="Modifier"
            onClick={() => setIsEditing(true)}
            color="#e0c084"
            style={{
              padding: "4px 10px",
              fontSize: 13,
              borderRadius: 5,
              minWidth: 0,
            }}
          />
          <Button
            title="Supprimer"
            onClick={handleDelete}
            color="#8c6a5d"
            disabled={loading}
            style={{
              padding: "4px 10px",
              fontSize: 13,
              borderRadius: 5,
              minWidth: 0,
            }}
          />
        </footer>
      )}
    </article>
  );
}
