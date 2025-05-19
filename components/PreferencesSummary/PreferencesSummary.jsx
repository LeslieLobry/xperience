'use client';

import { useEffect, useState } from 'react';
import Modal from '../Modal/Modal';
import PreferencesForm from '../PreferencesForm/PreferencesForm';
import Button from '../Button/Button';
import "../PreferencesSummary/PreferencesSummary.css";

export default function PreferencesSummary({ editable = false }) {
  const [recherches, setRecherches] = useState([]);
  const [envies, setEnvies] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); 
  const [confirmation, setConfirmation] = useState('');

  const fetchPreferences = async () => {
    const res = await fetch('/api/me', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setRecherches(data.user.recherches || []);
      setEnvies(data.user.envies || []);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, [refreshKey]);

  const handleOpenModal = () => setIsModalOpen(true);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setRefreshKey(prev => prev + 1); 
    setConfirmation("Préférences mises à jour ✅");
    setTimeout(() => setConfirmation(''), 3000);
  };

  return (
    <div className='preference-contenant'>
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
          <Button onClick={handleOpenModal} title="Modifier" color="#8c6a5d" />
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
