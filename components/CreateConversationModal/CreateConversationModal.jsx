"use client";

import { useEffect, useState } from "react";
import Select from "react-select";
import "./CreateConversationModal.css"

export default function CreateConversationModal({ currentUserId, onClose, onCreated }) {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [selection, setSelection] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    fetch("/api/utilisateur")
      .then((res) => res.json())
      .then((data) => {
        const filtres = data.utilisateurs.filter(u => u.id !== currentUserId);
        setUtilisateurs(filtres);
      })
      .catch(() => setErreur("Erreur lors du chargement des utilisateurs"));
  }, [currentUserId]);

  const handleCreate = async () => {
    if (selection.length === 0) {
      setErreur("Choisis au moins une personne");
      return;
    }

    setLoading(true);
    setErreur("");

    const participantIds = selection.map((s) => s.value);
    participantIds.push(currentUserId);

    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantIds }),
    });

    const data = await res.json();

   if (res.ok) {
  onCreated();  
  onClose();
    } else {
      setErreur(data.error || "Erreur");
    }

    setLoading(false);
  };

  // options pour react-select
  const options = utilisateurs.map((u) => ({
    value: u.id,
    label: u.pseudo,
  }));

  return (
    <div className="modal-conversation">
      <h3>Créer une nouvelle conversation</h3>
      {erreur && <p className="erreur">{erreur}</p>}

      <Select
        isMulti
        options={options}
        onChange={setSelection}
        placeholder="Rechercher des utilisateurs..."
        className="select-utilisateurs"
      />

      <div style={{ marginTop: "1rem" }}>
        <button onClick={handleCreate} disabled={loading}>
          {loading ? "Création..." : "Créer"}
        </button>
        <button onClick={onClose} className="annuler">Annuler</button>
      </div>
    </div>
  );
}
