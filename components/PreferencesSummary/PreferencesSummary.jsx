'use client';

import { useEffect, useState } from 'react';
import Modal from '../Modal/Modal';
import PreferencesForm from '../PreferencesForm/PreferencesForm';
import Button from '../Button/Button';
import "../PreferencesSummary/PreferencesSummary.css";

export default function PreferencesSummary({ editable = false, user }) {
  const [recherches, setRecherches] = useState(user?.recherches || []);
  const [envies, setEnvies] = useState(user?.envies || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setConfirmation("Préférences mises à jour ✅");
    setTimeout(() => setConfirmation(""), 3000);

    // Refresh les préférences à jour si besoin (optionnel)
    if (editable) {
      fetch("/api/me", { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          setRecherches(data.user.recherches || []);
          setEnvies(data.user.envies || []);
        });
    }
  };

  return (
    <div className="preference-contenant">
      <h2>Préférences</h2>
      <div className="ref">
        <div>
          <h3>Je recherche</h3>
          {recherches.length > 0 ? (
            <ul>
              {recherches.map((r, idx) => (
                <li key={idx}>{r.label}</li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "#a2b9c1" }}>Non défini</p>
          )}
        </div>
        <div>
          <h3>Mes envies</h3>
          {envies.length > 0 ? (
            <ul>
              {envies.map((e, idx) => (
                <li key={idx}>{e.label}</li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "#a2b9c1" }}>Non défini</p>
          )}
        </div>
      </div>

      {editable && (
        <>
          <Button onClick={() => setIsModalOpen(true)} title="Modifier" color="#8c6a5d" />
          {confirmation && (
            <p style={{ color: "#e0c084", fontWeight: "bold", marginTop: "1rem" }}>
              {confirmation}
            </p>
          )}
          <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
            <PreferencesForm onClose={handleCloseModal} />
          </Modal>
        </>
      )}
    </div>
  );
}
