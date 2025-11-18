"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import "./LikesSection.css";

export default function LikesSection() {
  const [onglet, setOnglet] = useState("recus");
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Sélection de la route API selon l’onglet
  const endpoint =
    onglet === "recus" ? "/api/likes/recus" : "/api/likes/donnes";

  useEffect(() => {
    setLoading(true);

    fetch(endpoint, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          console.warn("❗️Données invalides :", data);
          setLikes([]);
        } else {
          // Nettoyage doublons par utilisateur.id
          const seen = new Set();
          const uniques = data.filter((item) => {
            const utilisateur = item.from || item.to;
            if (!utilisateur?.id) return false;
            if (seen.has(utilisateur.id)) return false;
            seen.add(utilisateur.id);
            return true;
          });

          setLikes(uniques);
        }
      })
      .catch((err) => {
        console.error("❌ Erreur chargement likes :", err);
        setLikes([]);
      })
      .finally(() => setLoading(false));
  }, [endpoint]);

  return (
    <div className="likes-container">
      <h2 className="likes-title"> Historique des Likes ❤️</h2>

      <div className="likes-tabs">
        <button
          className={onglet === "recus" ? "active" : ""}
          onClick={() => setOnglet("recus")}
        >
          Ils m'ont liké ❤️
        </button>

        <button
          className={onglet === "donnes" ? "active" : ""}
          onClick={() => setOnglet("donnes")}
        >
          J'ai liké ⭐
        </button>
      </div>

      {loading ? (
        <p className="loading">⏳ Chargement...</p>
      ) : likes.length === 0 ? (
        <p className="aucune">😕 Aucun like pour le moment</p>
      ) : (
        <ul className="likes-list">
          {likes.map(({ id, from, to, createdAt }) => {
            const utilisateur = from || to;
            if (!utilisateur?.id) return null;

            return (
              <li key={id} className="like-item">
                <Link href={`/profil/${utilisateur.id}`}>
                  <div className="like-content">
                    <Image
                      src={utilisateur.photoUrl || "/images/default-avatar.png"}
                      alt={utilisateur.pseudo}
                      width={50}
                      height={50}
                      className="like-avatar"
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
