"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import "./ReglagesSection.css";

export default function ReglagesSection() {
  
  const { user, updateUser } = useAuth();
  const [pseudo, setPseudo] = useState("");
  const [message, setMessage] = useState("");


  // Initialise le pseudo dès que l'utilisateur est disponible
  useEffect(() => {
    if (user?.pseudo) {
      setPseudo(user.pseudo);
    }
  }, [user]);

  const handleChangePseudo = async () => {
    try {
      const res = await fetch("/api/utilisateur/update-pseudo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pseudo }),
      });

      if (res.ok) {
        const data = await res.json();
        updateUser({ pseudo: data.utilisateur.pseudo });
        setMessage("Pseudo mis à jour avec succès !");
      } else {
        setMessage("Erreur lors de la mise à jour.");
      }
    } catch (err) {
      setMessage("Erreur serveur.");
    }
  };

  const handleRecupererDonnees = async () => {
    try {
      const res = await fetch("/api/utilisateur/export-donnees", {
        method: "POST",
      });

      if (res.ok) {
        alert("Un lien vous sera envoyé par email dès que vos données seront prêtes.");
      } else {
        alert("Erreur lors de la demande.");
      }
    } catch {
      alert("Erreur serveur.");
    }
  };

  return (
    <div className="reglages-section">
      <h2 className="parametres-title">RÉGLAGES DE MON COMPTE</h2>

      <div className="reglage-item">
        <label>Pseudo</label>
        <div className="reglage-input-row">
          <input
            type="text"
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            className="reglage-input"
          />
          <button onClick={handleChangePseudo} className="btn-gerer">
            GÉRER
          </button>
        </div>
        {message && <p className="message-success">{message}</p>}
      </div>

      <div className="reglage-item">
        <label>Récupérer mes données</label>
        <div className="bloc-recuperation">
          <p>Vous pouvez télécharger une copie de vos informations à tout moment.</p>
          <p>Le téléchargement peut prendre un certain temps. Un email vous sera envoyé dès que votre archive est prête.</p>
          <p>Pour votre sécurité, n'ouvrez cette archive que dans un lieu privé.</p>
          <div className="bloc-actions">
            <button className="btn-danger" onClick={handleRecupererDonnees}>
              RÉCUPÉRER MES DONNÉES
            </button>
            <button className="btn-retour">RETOUR</button>
          </div>
        </div>
      </div>
    </div>
  );
}
