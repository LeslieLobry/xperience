"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import "./VisitesSection.css";

export default function VisitesSection() {
  const [onglet, setOnglet] = useState("recues");
  const [visites, setVisites] = useState([]);
  const [loading, setLoading] = useState(false);

  const endpoint =
    onglet === "recues" ? "/api/visites/recues" : "/api/visites/faites";

  // 🔧 Résolution de la vraie URL (S3 présignée ou autre)
  async function resolvePhotoUrl(photoUrl, cache) {
    if (!photoUrl) return "/images/default-avatar.png";

    // déjà une URL complète
    if (photoUrl.startsWith("http")) {
      return photoUrl;
    }

    // éviter les appels en double pour la même clé
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
      const finalUrl = data.url || "/images/default-avatar.png";
      cache.set(photoUrl, finalUrl);
      return finalUrl;
    } catch (e) {
      console.error("Erreur presign photo visite:", e);
      cache.set(photoUrl, "/images/default-avatar.png");
      return "/images/default-avatar.png";
    }
  }

  useEffect(() => {
    let cancelled = false;
    const photoCache = new Map();

    async function loadVisites() {
      setLoading(true);
      try {
        const res = await fetch(endpoint, { cache: "no-store" });
        const data = await res.json();

        if (!Array.isArray(data)) {
          console.warn("❗️Données non valides", data);
          if (!cancelled) setVisites([]);
          return;
        }

        const seen = new Set();
        const processed = [];

        for (const item of data) {
          const rawUser = item.visiteur || item.visite;
          if (!rawUser?.id) continue;

          // anti doublon
          if (seen.has(rawUser.id)) continue;
          seen.add(rawUser.id);

          const resolvedPhotoUrl = await resolvePhotoUrl(
            rawUser.photoUrl,
            photoCache
          );

          processed.push({
            id: item.id,
            date: item.date,
            utilisateur: {
              ...rawUser,
              resolvedPhotoUrl,
            },
          });
        }

        if (!cancelled) {
          setVisites(processed);
        }
      } catch (err) {
        console.error("❌ Erreur lors du chargement des visites :", err);
        if (!cancelled) setVisites([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadVisites();

    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  return (
    <div className="visites-container">
      <h2 className="visite-titre"> Historique de visites</h2>

      <div className="visites-tabs">
        <button
          className={onglet === "recues" ? "active" : ""}
          onClick={() => setOnglet("recues")}
        >
          Ils m&apos;ont visité
        </button>
        <button
          className={onglet === "faites" ? "active" : ""}
          onClick={() => setOnglet("faites")}
        >
          J&apos;ai visité
        </button>
      </div>

      {loading ? (
        <p className="loading">⏳ Chargement...</p>
      ) : visites.length === 0 ? (
        <p className="aucune">😕 Aucune visite pour le moment</p>
      ) : (
        <ul className="liste-visites">
          {visites.map(({ id, utilisateur, date }) => {
            if (!utilisateur?.id) return null;

            return (
              <li key={id} className="visite-item">
                <Link href={`/profil/${utilisateur.id}`}>
                  <div className="visite-content">
                    <Image
                      src={utilisateur.resolvedPhotoUrl || "/images/default-avatar.png"}
                      alt={utilisateur.pseudo}
                      width={50}
                      height={50}
                      className="visite-avatar"
                      unoptimized
                    />
                    <div className="visite-info">
                      <h3 className="visite-nom">{utilisateur.pseudo}</h3>
                      <span className="visite-date">
                        {new Date(date).toLocaleString("fr-FR", {
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
