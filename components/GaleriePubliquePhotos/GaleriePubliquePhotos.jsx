'use client';

import React, { useState, useEffect, useCallback } from 'react';
import PhotoUploader from '../PhotoUploader/PhotoUploader';
import { Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import "./GaleriePubliquePhotos.css";

/* -------------------------------------------------------------------------- */
/* 🔗 HOOK : charge toutes les presigned URLs S3 des photos de la galerie     */
/* -------------------------------------------------------------------------- */
function usePresignedGalleryUrls(photoList) {
  const [presignedUrls, setPresignedUrls] = useState({}); // { photoId: url }

  useEffect(() => {
    if (!Array.isArray(photoList) || photoList.length === 0) {
      setPresignedUrls({});
      return;
    }

    let unmounted = false;

    const load = async () => {
      const map = {};

      await Promise.all(
        photoList.map(async (photo) => {
          if (!photo?.url) {
            map[photo.id] = "/default.jpg";
          } else if (photo.url.startsWith("http")) {
            // URL déjà complète (S3/public) → on l'utilise telle quelle
            map[photo.id] = photo.url;
          } else {
            // Va chercher la presigned S3 pour la clé stockée en BDD
            try {
              const res = await fetch("/api/photos/presign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key: photo.url }),
              });
              const data = await res.json();
              map[photo.id] = data.url || "/default.jpg";
            } catch {
              map[photo.id] = "/default.jpg";
            }
          }
        })
      );

      if (!unmounted) {
        setPresignedUrls(map);
      }
    };

    load();

    return () => {
      unmounted = true;
    };
  }, [photoList]);

  // ⬅️ On renvoie aussi le setter pour pouvoir forcer l’URL
  return [presignedUrls, setPresignedUrls];
}

/* -------------------------------------------------------------------------- */
/* 📹 Détection vidéo                                                         */
/* -------------------------------------------------------------------------- */
function isVideo(url) {
  if (!url) return false;
  try {
    const u = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    const path = u.pathname.toLowerCase();
    return /\.(mp4|webm|ogg|mov)$/i.test(path);
  } catch {
    return /\.(mp4|webm|ogg|mov)$/i.test(url.toLowerCase());
  }
}

/* -------------------------------------------------------------------------- */
/* 🖼️ Galerie publique                                                       */
/* -------------------------------------------------------------------------- */
export default function GaleriePhotos({ photos = [], editable = false }) {
  const MAX_PHOTOS = 6;
  const [photoList, setPhotoList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(null);

  useEffect(() => {
    if (Array.isArray(photos)) setPhotoList(photos);
  }, [photos]);

  const [presignedUrls, setPresignedUrls] = usePresignedGalleryUrls(photoList);

  /* ---------------------------------------------------------------------- */
  /* ➕ Ajout d'une nouvelle photo : on force l'URL affichable immédiatement */
  /* ---------------------------------------------------------------------- */
  const handleNewPhoto = (photo) => {
    // On ajoute la photo dans la liste
    setPhotoList((prev) => [...prev, photo]);

    // On essaie tout de suite de calculer une URL affichable pour éviter /default.jpg
    (async () => {
      try {
        let finalUrl = "/default.jpg";

        if (photo?.url) {
          // Si le backend/PhotoUploader renvoie déjà une URL HTTP complète
          if (
            photo.url.startsWith("http") ||
            photo.url.startsWith("blob:") ||
            photo.url.startsWith("data:")
          ) {
            finalUrl = photo.url;
          } else {
            // Sinon, on va chercher sa presigned URL pour cette clé
            const res = await fetch("/api/photos/presign", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key: photo.url }),
            });
            const data = await res.json();
            finalUrl = data.url || "/default.jpg";
          }
        }

        // On met à jour la map uniquement pour cette nouvelle photo
        setPresignedUrls((prev) => ({
          ...prev,
          [photo.id]: finalUrl,
        }));
      } catch (err) {
        console.error("Erreur presign nouvelle photo:", err);
      }
    })();
  };

  /* ---------------------------------------------------------------------- */
  /* 🗑️ Suppression optimiste                                               */
  /* ---------------------------------------------------------------------- */
  const handleDelete = async (id) => {
    setCurrentIndex(null);

    setPhotoList((prev) => {
      const updated = prev.filter((p) => p.id !== id);

      (async () => {
        try {
          const res = await fetch(`/api/photos/${id}`, { method: "DELETE" });

          if (!res.ok) {
            console.error("Erreur suppression photo:", res.status);
            // Si tu veux rollback en cas d'erreur :
            // setPhotoList(prev);
          }
        } catch (err) {
          console.error("Erreur réseau suppression photo:", err);
          // Rollback possible ici aussi si tu veux
          // setPhotoList(prev);
        }
      })();

      return updated;
    });

    // On enlève aussi l'URL presignée pour cette photo
    setPresignedUrls((prev) => {
      const clone = { ...prev };
      delete clone[id];
      return clone;
    });
  };

  /* ---------------------------------------------------------------------- */
  /* 🔢 Gestion de l'index pour la lightbox                                 */
  /* ---------------------------------------------------------------------- */
  const safeSetCurrentIndex = useCallback(
    (setter) => {
      setCurrentIndex((i) => {
        const newIndex = typeof setter === "function" ? setter(i) : setter;
        if (newIndex < 0) return 0;
        if (newIndex >= photoList.length) return photoList.length - 1;
        return newIndex;
      });
    },
    [photoList.length]
  );

  const handleKeyDown = (e) => {
    if (currentIndex === null) return;
    if (e.key === "Escape") setCurrentIndex(null);
    if (e.key === "ArrowLeft") safeSetCurrentIndex((i) => (i > 0 ? i - 1 : i));
    if (e.key === "ArrowRight") safeSetCurrentIndex((i) => (i < photoList.length - 1 ? i + 1 : i));
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, photoList.length, safeSetCurrentIndex]);

  const emptySlots = MAX_PHOTOS - photoList.length;

  /* ---------------------------------------------------------------------- */
  /* 🧩 Rendu                                                               */
  /* ---------------------------------------------------------------------- */
  return (
    <div className="profil-section">
      <div className="gallery-grid">
        {photoList.map((photo, index) => {
          const src = presignedUrls[photo.id] || "/default.jpg";

          return (
            <div className="gallery-slot filled" key={photo.id}>
              {editable && (
                <button
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(photo.id);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              )}

              {isVideo(src) ? (
                <video
                  src={src}
                  controls
                  preload="metadata"
                  onClick={() => setCurrentIndex(index)}
                  style={{ cursor: "zoom-in", maxWidth: "100%", maxHeight: "100%" }}
                />
              ) : (
                <img
                  src={src}
                  alt={`Photo ${index + 1}`}
                  onClick={() => setCurrentIndex(index)}
                  style={{ cursor: "zoom-in" }}
                />
              )}
            </div>
          );
        })}

        {editable &&
          emptySlots > 0 &&
          Array.from({ length: emptySlots }).map((_, idx) => (
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

      {/* 🔍 Lightbox */}
      {currentIndex !== null && photoList[currentIndex] && (
        <div className="lightbox" onClick={() => setCurrentIndex(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setCurrentIndex(null)}>
              <X size={24} />
            </button>

            {currentIndex > 0 && (
              <button className="lightbox-prev" onClick={() => safeSetCurrentIndex((i) => i - 1)}>
                <ChevronLeft size={32} />
              </button>
            )}

            {currentIndex < photoList.length - 1 && (
              <button className="lightbox-next" onClick={() => safeSetCurrentIndex((i) => i + 1)}>
                <ChevronRight size={32} />
              </button>
            )}

            {(() => {
              const photo = photoList[currentIndex];
              const src = presignedUrls[photo.id] || "/default.jpg";

              return isVideo(src) ? (
                <video
                  src={src}
                  controls
                  autoPlay
                  preload="metadata"
                  style={{ maxWidth: "100%", maxHeight: "80vh" }}
                />
              ) : (
                <img
                  src={src}
                  alt="Agrandissement"
                  style={{ maxWidth: "100%", maxHeight: "80vh" }}
                />
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
