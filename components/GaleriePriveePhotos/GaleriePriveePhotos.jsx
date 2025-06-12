'use client';

import React, { useEffect, useState } from 'react';
import PhotoUploader from '../PhotoUploader/PhotoUploader';
// import '../GaleriePubliquePhotos/GaleriePhotos.css';
import { Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function GaleriePriveePhotos({ utilisateurId, editable = false, visiteurId }) {
  const MAX_PHOTOS = 6;
  const [photoList, setPhotoList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessStatus, setAccessStatus] = useState(null);
  // accessStatus: 'granted' | 'pending' | 'denied' | null

  // Charger la galerie privée et vérifier accès
  useEffect(() => {
    if (!utilisateurId) return;

    setLoading(true);
    fetch(`/api/utilisateur/${utilisateurId}/galerie-privees?visiteurId=${visiteurId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setAccessStatus('denied');
          setPhotoList([]);
        } else {
          setAccessStatus('granted');
          setPhotoList(data);
        }
      })
      .catch(() => {
        setAccessStatus('denied');
        setPhotoList([]);
      })
      .finally(() => setLoading(false));
  }, [utilisateurId, visiteurId]);

  // Demande d'accès si visiteur
  const handleDemandeAcces = async () => {
    if (!utilisateurId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/utilisateurs/${utilisateurId}/demande-acces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visiteurId }),
      });
      if (res.ok) setAccessStatus('pending');
      else throw new Error('Erreur');
    } catch {
      alert('Erreur lors de la demande d\'accès');
    }
    setLoading(false);
  };

  // Ajout photo (proprio uniquement)
  const handleNewPhoto = (photo) => {
    setPhotoList(prev => [...prev, photo]);
  };

  // Suppression photo (proprio uniquement)
  const handleDelete = async (id) => {
    if (!editable) return;
    const res = await fetch(`/api/photos/${id}`, { method: 'DELETE' });
    if (res.ok) setPhotoList(prev => prev.filter(p => p.id !== id));
  };

  // Gestion clavier lightbox (idem à ta galerie publique)
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

  // Affichage selon statut d'accès
  if (loading) return <div>Chargement...</div>;

  if (!editable && accessStatus === 'pending') {
    return <div>Votre demande d'accès est en attente de validation.</div>;
  }

  if (!editable && accessStatus === 'denied') {
    return (
      <div>
        <p>Cette galerie est privée. Vous devez en faire la demande pour y accéder.</p>
        <button onClick={handleDemandeAcces}>Demander accès</button>
      </div>
    );
  }

  if (!editable && accessStatus !== 'granted') {
    return <div>Accès non autorisé.</div>;
  }

  // Affichage galerie privée (proprio ou visiteur autorisé)
  const emptySlots = MAX_PHOTOS - photoList.length;

  return (
    <div className="profil-section">
      <h3 className="profil-section-title">Galerie privée</h3>
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

        {editable && emptySlots > 0 && Array.from({ length: emptySlots }).map((_, idx) => (
          <div className="gallery-slot empty" key={`empty-${idx}`}>
            <PhotoUploader isGallery galerieId={utilisateurId} onUpload={handleNewPhoto} />
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
