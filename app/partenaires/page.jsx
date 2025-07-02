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
    console.log("Statut réponse :", res.status);

    const data = await res.json();
    console.log("Partenaires récupérés :", data);

    if (Array.isArray(data)) {
      setPartenaires(data);
    } else {
      console.warn("La réponse n'est pas un tableau.");
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
