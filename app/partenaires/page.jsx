"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "./partenaires.css";

// Composant client pour gérer les images S3 privées ou publiques
function PresignedImage({ s3Key, alt, ...props }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!s3Key) return setUrl("/default.jpg");
    if (s3Key.startsWith("http")) return setUrl(s3Key); // cas URL publique ou déjà presignée
    fetch("/api/photos/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: s3Key }),
    })
      .then(res => res.json())
      .then(data => setUrl(data.url || "/default.jpg"))
      .catch(() => setUrl("/default.jpg"));
  }, [s3Key]);

  if (!url)
    return (
      <div
        style={{
          width: 90,
          height: 90,
          background: "#eee",
          borderRadius: "12px",
          margin: "0 auto 14px auto",
          display: "block",
        }}
      />
    );

  return (
    <img
      src={url}
      alt={alt}
      {...props}
      style={{
        width: 90,
        height: 90,
        objectFit: "cover",
        borderRadius: "12px",
        margin: "0 auto 14px auto",
        display: "block",
        boxShadow: "0 2px 10px #0002",
        ...props.style
      }}
    />
  );
}

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
            {p.photoUrl && (
              <PresignedImage s3Key={p.photoUrl} alt={p.nom} className="partenaire-photo" />
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
