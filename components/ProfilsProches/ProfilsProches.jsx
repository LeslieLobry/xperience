"use client";
import { useState } from "react";
import Link from "next/link";
import "./ProfilsProches.css"; // si besoin

export default function ProfilsProches({ profilsInitiaux }) {
  const [filtrerProches, setFiltrerProches] = useState(false);
  const [profils, setProfils] = useState(profilsInitiaux);
  const [loading, setLoading] = useState(false);

  const handleToggleProches = async () => {
    setFiltrerProches((prev) => !prev);

    if (!filtrerProches) {
      setLoading(true);
      try {
        const res = await fetch("/api/profils-proches");
        const data = await res.json();
        setProfils(data);
      } catch (err) {
        console.error("Erreur chargement profils proches :", err);
      }
      setLoading(false);
    } else {
      setProfils(profilsInitiaux);
    }
  };

  return (
    <div className="profils-proches-wrapper">
      <button onClick={handleToggleProches} className="btn-proches">
        {filtrerProches ? "Tous les profils" : "Profils près de chez moi"}
      </button>

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <div className="profils-grid">
          {profils.map((user) => (
            <Link href={`/profil/${user.id}`} key={user.id} className="profil-card-link">
              <div className="profil-card">
                <img
                  src={
                    user.photoUrl?.startsWith("http")
                      ? user.photoUrl
                      : user.photoUrl
                      ? `/uploads/${user.photoUrl.replace(/^\/?uploads\//, "")}`
                      : "/default.jpg"
                  }
                  alt={user.pseudo}
                  className="profil-photo"
                />
                <h2 className="profil-card-title">{user.pseudo}</h2>
                <p className="profil-card-details">
                  {user.age} ans - {user.localisation}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
