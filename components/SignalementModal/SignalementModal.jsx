"use client";

import { useState } from "react";
import "./SignalementModal.css";

export default function SignalementModal({ cibleId, onClose }) {
  const [motif, setMotif] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [envoye, setEnvoye] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch("/api/signalement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cibleId, motif, commentaire }),
    });
    setEnvoye(true);
    setTimeout(() => onClose(), 2000);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        {!envoye ? (
          <>
            <h2>Signaler ce membre</h2>
            <form onSubmit={handleSubmit}>
              <label>
                Motif :
                <select value={motif} onChange={(e) => setMotif(e.target.value)} required>
                  <option value="">-- Choisir un motif --</option>
                  <option value="contenu inapproprié">Contenu inapproprié</option>
                  <option value="faux profil">Faux profil</option>
                  <option value="harcèlement">Harcèlement</option>
                  <option value="autre">Autre</option>
                </select>
              </label>

              <label>
                Commentaire (optionnel) :
                <textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
              </label>

              <button type="submit">Envoyer</button>
              <button type="button" onClick={onClose} className="btn-cancel">Annuler</button>
            </form>
          </>
        ) : (
          <p className="confirmation">✅ Signalement envoyé. Merci.</p>
        )}
      </div>
    </div>
  );
}
