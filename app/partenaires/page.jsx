"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "./partenaires.css";

export default function PagePartenaires() {
  const [partenaires, setPartenaires] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPartenaires = async () => {
      try {
        const res = await fetch("/api/partenaires");
        const data = await res.json();
        if (Array.isArray(data)) {
          setPartenaires(data);
        }
      } catch (err) {
        console.error("Erreur chargement partenaires :", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPartenaires();
  }, []);

  return (
    <div className="page-partenaires">
      <h1 className="titre-page">Nos partenaires</h1>
      <div className="cartes-partenaires">
        {partenaires.map((p) => (
          <div className="carte-partenaire" key={p.id}>
            {/* Ajout de la photo si dispo */}
            {p.photoUrl && (
              <img
                src={p.photoUrl}
                alt={p.nom}
                className="partenaire-photo"
                style={{
                  width: 90,
                  height: 90,
                  objectFit: "cover",
                  borderRadius: "12px",
                  margin: "0 auto 14px auto",
                  display: "block",
                  boxShadow: "0 2px 10px #0002"
                }}
              />
            )}
            <h2>{p.nom}</h2>
            <p className="partenaire-type">{p.type}</p>
            <Link
              href={p.lien}
              target="_blank"
              rel="noopener noreferrer"
              className="partenaire-lien"
            >
              Visiter le site
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
