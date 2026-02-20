"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import Button from "../Button/Button";
import "./AvisCard.css";

export default function AvisCard({ avis, connectedUserId, cibleId, onRefresh }) {
  const [isEditing, setIsEditing] = useState(false);
  const [commentaire, setCommentaire] = useState(avis.commentaire || "");
  const [loading, setLoading] = useState(false);

  const isAuteur = connectedUserId === avis.auteurId;

  // ✅ on est sur SON profil (profil consulté = user connecté)
  const isOwnerProfile = Number(connectedUserId) === Number(cibleId);

  // ✅ peut supprimer si auteur OU propriétaire du profil
  const canDelete = isAuteur || isOwnerProfile;

  // ✅ ID auteur (pour lien)
  const auteurProfilId = avis?.auteur?.id ?? avis?.auteurId ?? null;
  const auteurHref = auteurProfilId ? `/profil/${auteurProfilId}` : null;

  // ✅ Photo : accepte avatarUrl OU photoUrl
  const avatarSrc = useMemo(() => {
    const url = avis?.auteur?.avatarUrl || avis?.auteur?.photoUrl;
    return url && typeof url === "string" && url.length ? url : "/default.jpg";
  }, [avis?.auteur?.avatarUrl, avis?.auteur?.photoUrl]);

  // ✅ Date formatée (si createdAt existe)
  const publishedAtLabel = useMemo(() => {
    const raw = avis?.createdAt || avis?.dateCreation || avis?.created_at || null;
    if (!raw) return null;

    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;

    try {
      const datePart = new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(d);
      const timePart = new Intl.DateTimeFormat("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);

      return `${datePart} à ${timePart}`;
    } catch {
      return d.toLocaleString("fr-FR");
    }
  }, [avis?.createdAt, avis?.dateCreation, avis?.created_at]);

  const handleDelete = useCallback(async () => {
    if (!confirm("Supprimer cet avis ?")) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/avis/${avis.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "X-Platform": "web" },
      });
      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err?.error || `HTTP ${res.status}`);
      }
      onRefresh?.();
    } catch (e) {
      console.error("Suppression avis échouée:", e);
      alert("Impossible de supprimer l'avis. Réessaie dans un instant.");
    } finally {
      setLoading(false);
    }
  }, [avis.id, onRefresh]);

  const handleEdit = useCallback(async () => {
    const payload = commentaire.trim();
    if (!payload) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/avis/${avis.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-Platform": "web" },
        body: JSON.stringify({ commentaire: payload }),
      });
      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err?.error || `HTTP ${res.status}`);
      }
      setIsEditing(false);
      onRefresh?.();
    } catch (e) {
      console.error("Edition avis échouée:", e);
      alert("Impossible d'enregistrer la modification.");
    } finally {
      setLoading(false);
    }
  }, [avis.id, commentaire, onRefresh]);

  const AuthorWrapper = ({ children }) => {
    if (!auteurHref) return children;
    return (
      <Link href={auteurHref} className="avis-author-link" title="Voir le profil">
        {children}
      </Link>
    );
  };

  return (
    <article className="avis-card">
      <header className="avis-header">
        <div className="avis-header-left">
          <AuthorWrapper>
            <Image
              src={avatarSrc}
              alt={`Avatar de ${avis?.auteur?.pseudo || "utilisateur"}`}
              width={28}
              height={28}
              className="avis-avatar"
            />
          </AuthorWrapper>

          <AuthorWrapper>
            <strong className="avis-author">{avis?.auteur?.pseudo} :</strong>
          </AuthorWrapper>
        </div>

        {publishedAtLabel && (
          <time className="avis-date" dateTime={String(avis?.createdAt || "")}>
            {publishedAtLabel}
          </time>
        )}
      </header>

      {isEditing ? (
        <div className="avis-edit">
          <textarea
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            disabled={loading}
            className="avis-textarea"
            maxLength={500}
          />
          <div className="avis-edit-actions">
            <Button
              title="Enregistrer"
              onClick={handleEdit}
              disabled={loading || !commentaire.trim()}
            />
            <Button
              title="Annuler"
              onClick={() => {
                setCommentaire(avis.commentaire || "");
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
            disabled={loading}
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

      {!isAuteur && canDelete && !isEditing && (
        <footer className="avis-footer">
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

/* Helpers */
async function safeJson(res) {
  try {
    const txt = await res.text();
    return JSON.parse(txt);
  } catch {
    return null;
  }
}