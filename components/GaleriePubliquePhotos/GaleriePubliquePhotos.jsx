'use client';

import React, { useState, useEffect, useCallback } from 'react';
import PhotoUploader from '../PhotoUploader/PhotoUploader';
import { Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import "./GaleriePubliquePhotos.css";

function fixPhotoUrl(url) {
  if (!url) return "/images/default-avatar.png";
  if (url.startsWith("/uploads/")) return url;
  if (url.startsWith("http")) return url;
  return `/uploads/${url.replace(/^.*[\\/]/, '')}`;
}

// Détection par extension OU par type dans l'URL S3
function isVideo(url) {
  if (!url) return false;
  try {
    const u = new URL(url, window.location.origin);
    const path = u.pathname.toLowerCase();
    return /\.(mp4|webm|ogg|mov)$/i.test(path);
  } catch {
    // fallback pour si URL n'est pas parsable
    return /\.(mp4|webm|ogg|mov)$/i.test(url.toLowerCase());
  }
}

export default function GaleriePhotos({ photos = [], editable = false }) {
  const MAX_PHOTOS = 6;
  const [photoList, setPhotoList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(null);

  useEffect(() => {
    if (Array.isArray(photos)) {
      setPhotoList(photos);
    }
  }, [photos]);

  const handleNewPhoto = (photo) => {
    setPhotoList(prev => [...prev, photo]);
  };

  const handleDelete = async (id) => {
    const res = await fetch(`/api/photos/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setPhotoList(prev => prev.filter(p => p.id !== id));
    }
  };

  // Sécurise l'accès à l'index
  const safeSetCurrentIndex = useCallback((setter) => {
    setCurrentIndex(i => {
      const newIndex = typeof setter === "function" ? setter(i) : setter;
      if (newIndex < 0) return 0;
      if (newIndex >= photoList.length) return photoList.length - 1;
      return newIndex;
    });
  }, [photoList.length]);

  const handleKeyDown = (e) => {
    if (currentIndex === null) return;
    if (e.key === 'Escape') setCurrentIndex(null);
    if (e.key === 'ArrowLeft') safeSetCurrentIndex(i => (i > 0 ? i - 1 : i));
    if (e.key === 'ArrowRight') safeSetCurrentIndex(i => (i < photoList.length - 1 ? i + 1 : i));
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, photoList.length, safeSetCurrentIndex]);

  const emptySlots = MAX_PHOTOS - photoList.length;

  return (
    <div className="profil-section">
      <div className="gallery-grid">
        {photoList.map((photo, index) => (
          <div className="gallery-slot filled" key={photo.id}>
            {editable && (
              <button className="delete-button" onClick={() => handleDelete(photo.id)}>
                <Trash2 size={16} />
              </button>
            )}
            {isVideo(photo.url) ? (
              <video
                src={fixPhotoUrl(photo.url)}
                controls
                preload="metadata"
                onClick={() => setCurrentIndex(index)}
                style={{ cursor: 'zoom-in', maxWidth: '100%', maxHeight: '100%' }}
              />
            ) : (
              <img
                src={fixPhotoUrl(photo.url)}
                alt={`Photo ${index + 1}`}
                onClick={() => setCurrentIndex(index)}
                style={{ cursor: 'zoom-in' }}
              />
            )}
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

      {currentIndex !== null && photoList[currentIndex] && (
        <div className="lightbox" onClick={() => setCurrentIndex(null)}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setCurrentIndex(null)}>
              <X size={24} />
            </button>

            {currentIndex > 0 && (
              <button className="lightbox-prev" onClick={() => safeSetCurrentIndex(i => i - 1)}>
                <ChevronLeft size={32} />
              </button>
            )}

            {currentIndex < photoList.length - 1 && (
              <button className="lightbox-next" onClick={() => safeSetCurrentIndex(i => i + 1)}>
                <ChevronRight size={32} />
              </button>
            )}

            {isVideo(photoList[currentIndex].url) ? (
              <video
                src={fixPhotoUrl(photoList[currentIndex].url)}
                controls
                autoPlay
                preload="metadata"
                style={{ maxWidth: "100%", maxHeight: "80vh" }}
              />
            ) : (
              <img
                src={fixPhotoUrl(photoList[currentIndex].url)}
                alt="Agrandissement"
                style={{ maxWidth: "100%", maxHeight: "80vh" }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
