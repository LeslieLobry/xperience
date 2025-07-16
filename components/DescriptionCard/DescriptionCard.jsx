'use client';

import { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import Button from '../Button/Button';
import '../DescriptionCard/descriptionCard.css';

import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

export default function DescriptionCard({
  editable = false,
  description = "",
  isModalOpen,
  setIsModalOpen
}) {
  const [currentDescription, setCurrentDescription] = useState(description);
  const [tempDescription, setTempDescription] = useState('');
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // Si la description change côté parent, on met à jour
  useEffect(() => {
    setCurrentDescription(description);
  }, [description]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/update-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ description: tempDescription }),
      });

      if (res.ok) {
        setCurrentDescription(tempDescription);
        setMessage('✅ Description mise à jour');
        setIsModalOpen(false);
        setShowEmojiPicker(false);
        setTimeout(() => setMessage(''), 3000);
      } else {
        const data = await res.json();
        setMessage(data.message || "Erreur lors de l'enregistrement.");
      }
    } catch (error) {
      console.error("Erreur serveur :", error);
      setMessage("Erreur serveur.");
    }
    setSaving(false);
  };

  return (
    <div className="description-card">
      <h3>Description</h3>
      <p>{currentDescription || 'Non défini'}</p>

      {message && <p className="description-message">{message}</p>}

      {editable && (
        <Button
          title="Modifier"
          onClick={() => {
            setTempDescription(currentDescription);
            setIsModalOpen(true);
            setShowEmojiPicker(false);
          }}
          color="#8c6a5d"
        />
      )}

      {editable && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <h3>Modifier la description</h3>
          <textarea
            value={tempDescription}
            onChange={(e) => setTempDescription(e.target.value)}
            rows={5}
            style={{ width: '100%' }}
          />

          <Button
            title={showEmojiPicker ? 'Masquer les emojis' : '😀 Ajouter un emoji'}
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            color="#d9d9d9"
          />

          {showEmojiPicker && (
            <div className="emoji-picker-container">
              <Picker
                data={data}
                onEmojiSelect={(emoji) =>
                  setTempDescription((prev) => prev + emoji.native)
                }
              />
            </div>
          )}

          <div className="modal-buttons">
            <Button
              title="Enregistrer"
              onClick={handleSave}
              color="#e0c084"
              disabled={saving}
            />
            <Button
              title="Annuler"
              onClick={() => setIsModalOpen(false)}
              color="#a2b9c1"
              disabled={saving}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
