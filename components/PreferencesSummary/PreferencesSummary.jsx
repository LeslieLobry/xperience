'use client';

import { useEffect, useState } from 'react';
import Modal from '../Modal/Modal';
import PreferencesForm from '../PreferencesForm/PreferencesForm';

export default function PreferencesSummary() {
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
  }, [refreshKey]); // <-- refresh quand refreshKey change

  const handleOpenModal = () => setIsModalOpen(true);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setRefreshKey(prev => prev + 1); 
    setConfirmation("Préférences mises à jour ✅");
    setTimeout(() => setConfirmation(''), 3000);
  };

  return (
    <div>
      <h2>Préférences</h2>
      <div>
        <h3>Je recherche</h3>
        {recherches.length > 0 ? (
          <ul>
            {recherches.map((r, idx) => (
              <li key={idx}>{r.label}</li>
            ))}
          </ul>
        ) : (
          <p style={{ color: 'red' }}>Non défini</p>
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
          <p style={{ color: 'red' }}>Non défini</p>
        )}
      </div>

      <button onClick={handleOpenModal}>Modifier</button>
            {confirmation && (
               <p style={{ color: "green", fontWeight: "bold", marginTop: "1rem" }}>
              {confirmation}
            </p>
            )}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <PreferencesForm onClose={handleCloseModal} />
      </Modal>
    </div>
  );
}
