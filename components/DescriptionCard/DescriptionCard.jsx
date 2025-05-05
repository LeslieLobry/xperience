'use client';

import { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';

export default function DescriptionCard() {
  const [currentDescription, setCurrentDescription] = useState('');
  const [tempDescription, setTempDescription] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState('');

  // 🔄 Charge la description de l'utilisateur
  useEffect(() => {
    async function fetchDescription() {
      try {
        const res = await fetch('/api/me', { credentials: 'include' });
        const data = await res.json();
        if (res.ok && data.user) {
          setCurrentDescription(data.user.description || '');
        }
      } catch (error) {
        console.error('Erreur lors du chargement du profil :', error);
      }
    }

    fetchDescription();
  }, []);

  const handleSave = async () => {
    try {
      const res = await fetch('/api/update-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ description: tempDescription })
      });

      if (res.ok) {
        setCurrentDescription(tempDescription);
        setMessage('Description mise à jour ✅');
        setIsModalOpen(false);
      } else {
        const data = await res.json();
        setMessage(data.message || "Erreur lors de l'enregistrement.");
      }
    } catch (error) {
      console.error("Erreur réseau :", error);
      setMessage("Erreur serveur.");
    }
  };

  return (
    <div className="description-card">
      <div>
        <strong>Description</strong>
        <p>{currentDescription || 'Non défini'}</p>
      </div>

      <button onClick={() => {
        setTempDescription(currentDescription);
        setIsModalOpen(true);
      }}>
        Modifier
      </button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h3>Modifier la description</h3>
        <textarea
          value={tempDescription}
          onChange={(e) => setTempDescription(e.target.value)}
          rows={5}
        />
        <div>
          <button onClick={handleSave}>Enregistrer</button>
          <button onClick={() => setIsModalOpen(false)}>Annuler</button>
        </div>
        {message && <p>{message}</p>}
      </Modal>
    </div>
  );
}
