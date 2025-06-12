'use client';

import React, { useState, useEffect } from 'react';
import PhotoUploader from '../PhotoUploader/PhotoUploader';
import { Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function GaleriePhotos({ utilisateurId, editable = false }) {
  const MAX_PHOTOS = 6;
  const [photoList, setPhotoList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(null);

  useEffect(() => {
    if (!utilisateurId) return;

    fetch(`/api/utilisateur/${utilisateurId}/photos-publics`)
      .then(res => res.json())
      .then(data => setPhotoList(data))
      .catch(err => console.error("Erreur chargement photos publiques :", err));
  }, [utilisateurId]);

  const handleNewPhoto = (photo) => {
    setPhotoList(prev => [...prev, photo]);
  };

  const handleDelete = async (id) => {
    const res = await fetch(`/api/photos/${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setPhotoList(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleKeyDown = (e) => {
    if (currentIndex === null) return;
    if (e.key === 'Escape') setCurrentIndex(null);
    if (e.key === 'ArrowLeft') setCurrentIndex(i => (i > 0 ? i - 1 : i));
    if (e.key === 'ArrowRight') setCurrentIndex(i => (i < photoList.length - 1 ? i + 1 : i));
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, photoList.length]);

  const emptySlots = MAX_PHOTOS - photoList.length;

  return (
    <div className="profil-section">
      <h3 className="profil-section-title">Galerie publique</h3>
      <div className="gallery-grid">
        {photoList.map((photo, index) => (
          <div className="gallery-slot filled" key={photo.id}>
            {editable && (
              <button className="delete-button" onClick={() => handleDelete(photo.id)}>
                <Trash2 size={16} />
              </button>
            )}
            <img
              src={photo.url}
              alt={`Photo ${index + 1}`}
              onClick={() => setCurrentIndex(index)}
              style={{ cursor: 'zoom-in' }}
            />
          </div>
        ))}

        {editable && emptySlots > 0 && Array.from({ length: emptySlots }).map((_, idx) => (
          <div className="gallery-slot empty" key={`empty-${idx}`}>
            <PhotoUploader
              isGallery={true}
              isPublic={true}
              isOwnProfile={true}
              onUpload={handleNewPhoto}
            />
          </div>
        ))}
      </div>

      {currentIndex !== null && (
        <div className="lightbox" onClick={() => setCurrentIndex(null)}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setCurrentIndex(null)}>
              <X size={24} />
            </button>

            {currentIndex > 0 && (
              <button className="lightbox-prev" onClick={() => setCurrentIndex(i => i - 1)}>
                <ChevronLeft size={32} />
              </button>
            )}

            {currentIndex < photoList.length - 1 && (
              <button className="lightbox-next" onClick={() => setCurrentIndex(i => i + 1)}>
                <ChevronRight size={32} />
              </button>
            )}

            <img src={photoList[currentIndex].url} alt="Agrandissement" />
          </div>
        </div>
      )}
    </div>
  );
}
