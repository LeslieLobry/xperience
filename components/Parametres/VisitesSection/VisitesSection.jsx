"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import "./VisitesSection.css";

export default function VisitesSection() {
  const [onglet, setOnglet] = useState("recues");
  const [visites, setVisites] = useState([]);
  const [loading, setLoading] = useState(false);

  const endpoint = onglet === "recues" ? "/api/visites/recues" : "/api/visites/faites";

  useEffect(() => {
    setLoading(true);
    fetch(endpoint)
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          console.warn("❗️Données non valides");
          setVisites([]);
        } else {
          // 🔁 Suppression des doublons par utilisateur.id
          const seen = new Set();
          const uniques = data.filter(({ visiteur, visite }) => {
            const utilisateur = visiteur || visite;
            if (!utilisateur?.id) return false;
            if (seen.has(utilisateur.id)) return false;
            seen.add(utilisateur.id);
            return true;
          });

          setVisites(uniques);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ Erreur lors du chargement des visites :", err);
        setVisites([]);
        setLoading(false);
      });
  }, [endpoint]);

  return (
    <div className="visites-container">
      <h2 className="visite-titre"> Historique de visites</h2>

      <div className="visites-tabs">
        <button className={onglet === "recues" ? "active" : ""} onClick={() => setOnglet("recues")}>
        Ils m'ont visité  
        </button>
        <button className={onglet === "faites" ? "active" : ""} onClick={() => setOnglet("faites")}>
           J'ai visité
        </button>
      </div>

      {loading ? (
        <p className="loading">⏳ Chargement...</p>
      ) : visites.length === 0 ? (
        <p className="aucune">😕 Aucune visite pour le moment</p>
      ) : (
        <ul className="liste-visites">
          {visites.map(({ id, visiteur, visite, date }) => {
            const utilisateur = visiteur || visite;
            if (!utilisateur?.id) return null;

            return (
              <li key={id} className="visite-item">
                <Link href={`/profil/${utilisateur.id}`}>
                  <div className="visite-content">
                    <Image
                      src={utilisateur.photoUrl || "/images/default-avatar.png"}
                      alt={utilisateur.pseudo}
                      width={50}
                      height={50}
                      className="visite-avatar"
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
