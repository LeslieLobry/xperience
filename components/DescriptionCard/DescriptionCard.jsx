'use client';

import { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import Button from '../Button/Button';
import "../DescriptionCard/descriptionCard.css";

export default function DescriptionCard() {
  const [currentDescription, setCurrentDescription] = useState('');
  const [tempDescription, setTempDescription] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState('');

  // 🔄 Chargement de la description depuis l'API
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
        body: JSON.stringify({ description: tempDescription }),
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
      <h3>Description</h3>
      <p>{currentDescription || 'Non défini'}</p>

      <Button
        title="Modifier"
        onClick={() => {
          setTempDescription(currentDescription);
          setIsModalOpen(true);
        }}
        color="#8c6a5d"
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h3>Modifier la description</h3>
        <textarea
          value={tempDescription}
          onChange={(e) => setTempDescription(e.target.value)}
          rows={5}
          style={{ width: "100%" }}
        />
        <div className="modal-buttons">
          <Button
            title="Enregistrer"
            onClick={handleSave}
            color="#e0c084"
          />
          <Button
            title="Annuler"
            onClick={() => setIsModalOpen(false)}
            color="#a2b9c1"
          />
        </div>
      </Modal>
    </div>
  );
}
