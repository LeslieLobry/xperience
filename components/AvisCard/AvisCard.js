"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import Button from "../Button/Button";
import "./AvisCard.css";

/* -------------------------------------------------------------------------- */
/* ✅ Presign cache (comme ta liste conv)                                     */
/* -------------------------------------------------------------------------- */
const PRESIGN_TTL_MS = 50 * 60 * 1000;
const presignCache = new Map(); // key -> { url, exp }
const presignInflight = new Map(); // key -> Promise

async function getPresignedUrl(key) {
  if (!key) return "/default.jpg";
  if (key.startsWith("http")) return key;

  const now = Date.now();
  const cached = presignCache.get(key);
  if (cached && cached.exp > now) return cached.url;

  if (presignInflight.has(key)) return presignInflight.get(key);

  const p = fetch("/api/photos/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
    credentials: "include",
  })
    .then((r) => r.json())
    .then((data) => {
      const url = data?.url || "/default.jpg";
      presignCache.set(key, { url, exp: now + PRESIGN_TTL_MS });
      return url;
    })
    .catch(() => "/default.jpg")
    .finally(() => presignInflight.delete(key));

  presignInflight.set(key, p);
  return p;
}

export default function AvisCard({ avis, connectedUserId, cibleId, onRefresh }) {
  const [isEditing, setIsEditing] = useState(false);
  const [commentaire, setCommentaire] = useState(avis.commentaire || "");
  const [loading, setLoading] = useState(false);

  const isAuteur = connectedUserId === avis.auteurId;
  const isOwnerProfile = Number(connectedUserId) === Number(cibleId);
  const canDelete = isAuteur || isOwnerProfile;

  const auteurProfilId = avis?.auteur?.id ?? avis?.auteurId ?? null;
  const auteurHref = auteurProfilId ? `/profil/${auteurProfilId}` : null;

  const auteurPseudo = avis?.auteur?.pseudo || "Utilisateur";

  const rawPhoto = avis?.auteur?.photoUrl || avis?.auteur?.avatarUrl || "";

  const [avatarUrl, setAvatarUrl] = useState("/default.jpg");

  useEffect(() => {
    let canceled = false;

    async function run() {
      if (!rawPhoto) {
        setAvatarUrl("/default.jpg");
        return;
      }

      if (rawPhoto.startsWith("http")) {
        setAvatarUrl(rawPhoto);
        return;
      }

      if (rawPhoto.startsWith("/")) {
        setAvatarUrl(`https://www.x-periences.fr${rawPhoto}`);
        return;
      }

      const u = await getPresignedUrl(rawPhoto);
      if (!canceled) setAvatarUrl(u || "/default.jpg");
    }

    run().catch(() => setAvatarUrl("/default.jpg"));

    return () => {
      canceled = true;
    };
  }, [rawPhoto]);

  const publishedAtLabel = useMemo(() => {
    const raw = avis?.createdAt || null;
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
  }, [avis?.createdAt]);

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

  const HeaderContent = (
    <>
      <div className="avis-header-left">
        {avatarUrl && avatarUrl !== "/default.jpg" ? (
          <img
            src={avatarUrl}
            alt={`Avatar de ${auteurPseudo}`}
            className="avis-avatar"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/default.jpg";
            }}
          />
        ) : (
          <div className="avis-avatar-placeholder">{getInitials(auteurPseudo)}</div>
        )}

        <strong className="avis-author">{auteurPseudo} :</strong>
      </div>

      {publishedAtLabel && (
        <time className="avis-date" dateTime={String(avis?.createdAt || "")}>
          {publishedAtLabel}
        </time>
      )}
    </>
  );

  return (
    <article className="avis-card">
      <header className="avis-header">
        {auteurHref ? (
          <Link href={auteurHref} className="avis-author-link" title="Voir le profil">
            {HeaderContent}
          </Link>
        ) : (
          <div className="avis-author-link">{HeaderContent}</div>
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
            style={{ padding: "4px 10px", fontSize: 13, borderRadius: 5, minWidth: 0 }}
          />

          <Button
            title="Supprimer"
            onClick={handleDelete}
            color="#8c6a5d"
            disabled={loading}
            style={{ padding: "4px 10px", fontSize: 13, borderRadius: 5, minWidth: 0 }}
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
            style={{ padding: "4px 10px", fontSize: 13, borderRadius: 5, minWidth: 0 }}
          />
        </footer>
      )}
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */
function getInitials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

async function safeJson(res) {
  try {
    const txt = await res.text();
    return JSON.parse(txt);
  } catch {
    return null;
  }
}