"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import "./LikesSection.css";

export default function LikesSection() {
  const [onglet, setOnglet] = useState("recus");
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(false);

  const endpoint = onglet === "recus" ? "/api/likes/recus" : "/api/likes/donnes";

  // Petite fonction utilitaire pour avoir une vraie URL d'image
  async function resolvePhotoUrl(photoUrl, cache) {
    if (!photoUrl) return "/default.jpg";

    // Si c'est déjà une URL complète => on renvoie tel quel
    if (typeof photoUrl === "string" && photoUrl.startsWith("http")) {
      return photoUrl;
    }

    // On évite de refaire 10x le même appel pour la même clé
    if (cache.has(photoUrl)) {
      return cache.get(photoUrl);
    }

    try {
      const res = await fetch("/api/photos/presign", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: photoUrl }),
      });

      if (!res.ok) throw new Error("presign failed");
      const data = await res.json();
      const finalUrl = data.url || "/default.jpg";
      cache.set(photoUrl, finalUrl);
      return finalUrl;
    } catch (e) {
      console.error("Erreur presign photo:", e);
      cache.set(photoUrl, "/default.jpg");
      return "/default.jpg";
    }
  }

  useEffect(() => {
    let cancelled = false;
    const photoCache = new Map();

    async function loadLikes() {
      setLoading(true);
      try {
        const res = await fetch(endpoint, {
          cache: "no-store",
          credentials: "include",
        });
        const data = await res.json();

        if (!Array.isArray(data)) {
          console.warn("❗️Données invalides :", data);
          if (!cancelled) setLikes([]);
          return;
        }

        // ✅ Tri pour que le dernier like apparaisse en haut
        const sorted = [...data].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const seen = new Set();
        const processed = [];

        for (const item of sorted) {
          // ✅ IMPORTANT : on choisit le bon user selon l'onglet
          const rawUser = onglet === "recus" ? item.from : item.to;
          if (!rawUser?.id) continue;

          // (Optionnel) Si tu veux voir plusieurs likes du même profil, supprime ce bloc
          if (seen.has(rawUser.id)) continue;
          seen.add(rawUser.id);

          const resolvedPhotoUrl = await resolvePhotoUrl(rawUser.photoUrl, photoCache);

          processed.push({
            id: item.id,
            createdAt: item.createdAt,
            utilisateur: {
              ...rawUser,
              resolvedPhotoUrl,
            },
          });
        }

        if (!cancelled) {
          setLikes(processed);
        }
      } catch (err) {
        console.error("❌ Erreur chargement likes :", err);
        if (!cancelled) setLikes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadLikes();

    return () => {
      cancelled = true;
    };
  }, [endpoint, onglet]); // ✅ on ajoute onglet car il influence rawUser

  return (
    <div className="likes-container">
      <h2 className="likes-title"> Historique des Likes ❤️</h2>

      <div className="likes-tabs">
        <button
          className={onglet === "recus" ? "active" : ""}
          onClick={() => setOnglet("recus")}
        >
          Ils m&apos;ont liké ❤️
        </button>

        <button
          className={onglet === "donnes" ? "active" : ""}
          onClick={() => setOnglet("donnes")}
        >
          J&apos;ai liké ⭐
        </button>
      </div>

      {loading ? (
        <p className="loading">⏳ Chargement...</p>
      ) : likes.length === 0 ? (
        <p className="aucune">😕 Aucun like pour le moment</p>
      ) : (
        <ul className="likes-list">
          {likes.map(({ id, utilisateur, createdAt }) => {
            if (!utilisateur?.id) return null;

            return (
              <li key={id} className="like-item">
                <Link href={`/profil/${utilisateur.id}`}>
                  <div className="like-content">
                    <Image
                      src={utilisateur.resolvedPhotoUrl || "/default.jpg"}
                      alt={utilisateur.pseudo || "Profil"}
                      width={50}
                      height={50}
                      className="like-avatar"
                      unoptimized
                    />

                    <div className="like-info">
                      <h3 className="like-nom">{utilisateur.pseudo}</h3>
                      <span className="like-date">
                        {new Date(createdAt).toLocaleString("fr-FR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
