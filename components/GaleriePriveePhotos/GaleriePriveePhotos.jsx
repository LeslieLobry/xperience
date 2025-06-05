'use client';

import React, { useEffect, useState } from 'react';
import PhotoUploader from '../PhotoUploader/PhotoUploader';
import CreerGaleriePrivee from '../CreerGaleriePrivee/CreerGaleriePrivee';
import '../GaleriePhotos/GaleriePhotos.css';
import { Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function GaleriePriveePhotos({ editable = false, utilisateurId }) {
  const MAX_PHOTOS = 6;
  const [galerie, setGalerie] = useState(null);
  const [photoList, setPhotoList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessGranted, setAccessGranted] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  // Récupération galerie de l'utilisateur
  useEffect(() => {
    const fetchGalerie = async () => {
      const res = await fetch(`/api/utilisateurs/${utilisateurId}/galerie-privee`);
      if (res.ok) {
        const data = await res.json();
        setGalerie(data);
      } else {
        setGalerie(null);
      }
    };
    if (utilisateurId) fetchGalerie();
  }, [utilisateurId]);

  // Chargement des photos
  const checkAccess = async () => {
    if (!galerie) return;
    const res = await fetch(`/api/galeries-privees/${galerie.id}/photos`);
    if (res.ok) {
      const data = await res.json();
      setPhotoList(data.photos);
      setAccessGranted(true);
    } else {
      setAccessGranted(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (galerie?.id) checkAccess();
  }, [galerie]);

  const handleSubmitCode = async (e) => {
    e.preventDefault();
    setError('');
    const res = await fetch(`/api/galeries-privees/${galerie.id}/verifier-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (res.ok) {
      setAccessGranted(true);
      setCode('');
      await checkAccess();
    } else {
      const data = await res.json();
      setError(data.error || 'Erreur');
    }
  };

  const handleNewPhoto = async (file) => {
    if (!editable || !galerie?.id) return;
    const formData = new FormData();
    formData.append('photo', file);
    const res = await fetch(`/api/galeries-privees/${galerie.id}/photos`, {
      method: 'POST',
      body: formData,
    });
    if (res.ok) await checkAccess();
  };

  const handleDelete = async (id) => {
    if (!editable) return;
    const res = await fetch(`/api/galeries-privees/${galerie.id}/photos?photoId=${id}`, {
      method: 'DELETE',
    });
    if (res.ok) await checkAccess();
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
  }, [currentIndex]);

  // ➤ Aucune galerie privée : proposer formulaire de création
  if (galerie === null && editable) {
    return (
      <CreerGaleriePrivee utilisateurId={utilisateurId} onCreated={setGalerie} />
    );
  }

  // ➤ Galerie présente mais pas encore de code validé
  if (galerie && !accessGranted) {
    return (
      <form onSubmit={handleSubmitCode} className="code-access-form">
        <h3>Accès galerie privée</h3>
        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Entrez le code"
        />
        <button type="submit">Valider</button>
        {error && <p className="error-text">{error}</p>}
      </form>
    );
  }

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
              <PhotoUploader
                isGallery={true}
                galerieId={galerie.id}
                onUpload={handleNewPhoto}
              />
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
