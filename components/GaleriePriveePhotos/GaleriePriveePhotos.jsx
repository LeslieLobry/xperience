'use client';

import React, { useEffect, useState } from 'react';
import PhotoUploader from '../PhotoUploader/PhotoUploader';
import '../GaleriePhotos/GaleriePhotos.css';
import { Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function GaleriePriveePhotos({
  galerieId,
  editable = false,
  utilisateurId
}) {
  const MAX_PHOTOS = 6;
  const [photoList, setPhotoList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [loading, setLoading] = useState(true);

  // Charge toujours depuis l'API (source de vérité)
  const fetchPhotos = async () => {
    if (!galerieId) return;
    setLoading(true);
    const res = await fetch(`/api/galeries-privees/${galerieId}/photos`);
    if (res.ok) {
      const data = await res.json();
      setPhotoList(data.photos);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galerieId]);

  // Ajout d'une photo
  const handleNewPhoto = async (url) => {
    if (!editable || !utilisateurId) return;
    const res = await fetch(`/api/galeries-privees/${galerieId}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, utilisateurId }),
    });
    if (res.ok) {
      // On ne push plus en local, on refetch (plus clean !)
      await fetchPhotos();
    }
  };

  // Suppression d'une photo
  const handleDelete = async (id) => {
    if (!editable) return;
    const res = await fetch(`/api/photos/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await fetchPhotos();
    }
  };

  // Navigation/zoom
  const handleKeyDown = (e) => {
    if (currentIndex === null) return;
    if (e.key === 'Escape') setCurrentIndex(null);
    if (e.key === 'ArrowLeft') setCurrentIndex(i => (i > 0 ? i - 1 : i));
    if (e.key === 'ArrowRight') setCurrentIndex(i => (i < photoList.length - 1 ? i + 1 : i));
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, photoList.length]);

  const emptySlots = MAX_PHOTOS - photoList.length;

  return (
    <div className="profil-section">
      <h3 className="profil-section-title">Galerie privée</h3>
      {loading ? (
        <div>Chargement...</div>
      ) : (
        <div className="gallery-grid">
          {photoList.map((photo, index) => (
            <div className="gallery-slot filled" key={photo.id || index}>
              {editable && (
                <button className="delete-button" onClick={() => handleDelete(photo.id)}>
                  <Trash2 size={16} />
                </button>
              )}
              <img
                src={photo.url}
                alt={`Photo ${index + 1}`}
                onClick={() => setCurrentIndex(index)}
                style={{ cursor: "zoom-in" }}
              />
            </div>
          ))}

          {editable && Array.from({ length: emptySlots }).map((_, idx) => (
            <div className="gallery-slot empty" key={`empty-${idx}`}>
              <PhotoUploader isGallery onUpload={handleNewPhoto} />
            </div>
          ))}
        </div>
      )}

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
