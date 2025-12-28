"use client";

import React, { useEffect, useRef, useState } from "react";
import PhotoUploader from "../PhotoUploader/PhotoUploader";
import { Trash2, X, ChevronLeft, ChevronRight } from "lucide-react";

// HOOK pour charger les presigned URLs des photos S3
function usePresignedGalleryUrls(photoList) {
  const [presignedUrls, setPresignedUrls] = useState({});
  const inflightRef = useRef(new Set()); // évite de presign 2x la même photo

  useEffect(() => {
    if (!Array.isArray(photoList)) return;
    let unmounted = false;

    const load = async () => {
      const next = {};

      await Promise.all(
        photoList.map(async (photo) => {
          const id = photo?.id;
          const keyOrUrl = photo?.url;

          if (!id) return;

          // ✅ Si déjà en cache, on garde
          if (presignedUrls[id]) {
            next[id] = presignedUrls[id];
            return;
          }

          // ✅ Pas de clé => fallback
          if (!keyOrUrl) {
            next[id] = "/default.jpg";
            return;
          }

          // ✅ URL http directe
          if (keyOrUrl.startsWith("http")) {
            next[id] = keyOrUrl;
            return;
          }

          // ✅ Déjà en cours de presign => on laisse (évite spam)
          if (inflightRef.current.has(id)) {
            return;
          }

          inflightRef.current.add(id);
          try {
            const res = await fetch("/api/photos/presign", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key: keyOrUrl }),
            });
            const data = await res.json();
            next[id] = data.url || "/default.jpg";
          } catch {
            next[id] = "/default.jpg";
          } finally {
            inflightRef.current.delete(id);
          }
        })
      );

      if (!unmounted && Object.keys(next).length > 0) {
        setPresignedUrls((prev) => ({ ...prev, ...next }));
      }
    };

    load();
    return () => {
      unmounted = true;
    };
    // ⚠️ on dépend de photoList ET presignedUrls pour compléter au fur et à mesure
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoList]);

  return presignedUrls;
}

export default function GaleriePriveePhotos({
  utilisateurId,
  editable = false,
  visiteurId,
}) {
  const MAX_PHOTOS = 6;
  const [photoList, setPhotoList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessStatus, setAccessStatus] = useState(null); // 'granted' | 'pending' | 'denied' | null
  const [galerieId, setGalerieId] = useState(null); // ⭐ id réel de la galerie privée

  // 1) Charger les photos + statut d'accès (+ galerieId)
  useEffect(() => {
    if (!utilisateurId) return;
    const visiteur = visiteurId || utilisateurId;
    setLoading(true);

    fetch(
      `/api/utilisateur/${utilisateurId}/galerie-privee?visiteurId=${visiteur}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.access === "pending") {
          setAccessStatus("pending");
          setPhotoList([]);
        } else if (data.access === "refused" || data.access === "none") {
          setAccessStatus("denied");
          setPhotoList([]);
        } else if (data.access === "granted") {
          setAccessStatus("granted");
          setPhotoList(data.photos || []);
        }

        if (data.galerieId) {
          setGalerieId(data.galerieId);
        }
      })
      .catch((err) => {
        console.error("Erreur galerie privée :", err);
        setAccessStatus("denied");
        setPhotoList([]);
      })
      .finally(() => setLoading(false));
  }, [utilisateurId, visiteurId]);

  const presignedUrls = usePresignedGalleryUrls(photoList);

  const handleDemandeAcces = async () => {
    const visiteur = visiteurId || utilisateurId;
    if (!utilisateurId || !visiteur) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/utilisateur/${utilisateurId}/demande-acces`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visiteurId: visiteur }),
      });
      if (res.ok) setAccessStatus("pending");
      else throw new Error("Erreur");
    } catch {
      alert("Erreur lors de la demande d'accès");
    }
    setLoading(false);
  };

  // ✅ Upload : ajoute direct dans la liste
  // + ajoute une "clé stable" si jamais id manque (cas rare)
  const handleNewPhoto = (photo) => {
    const safePhoto = photo?.id
      ? photo
      : { ...photo, id: `tmp-${Date.now()}-${Math.random()}` };

    setPhotoList((prev) => [safePhoto, ...prev]);
  };

  const handleDelete = async (id) => {
    if (!editable) return;
    const res = await fetch(`/api/photos/${id}`, { method: "DELETE" });
    if (res.ok) setPhotoList((prev) => prev.filter((p) => p.id !== id));
  };

  const handleKeyDown = (e) => {
    if (currentIndex === null) return;
    if (e.key === "Escape") setCurrentIndex(null);
    if (e.key === "ArrowLeft")
      setCurrentIndex((i) => (i > 0 ? i - 1 : i));
    if (e.key === "ArrowRight")
      setCurrentIndex((i) => (i < photoList.length - 1 ? i + 1 : i));
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, photoList.length]);

  if (loading) return <div>Chargement...</div>;

  if (!editable && accessStatus === "pending") {
    return <div>Votre demande d'accès est en attente de validation.</div>;
  }

  if (!editable && (accessStatus === "denied" || accessStatus === null)) {
    return (
      <div>
        <p>Cette galerie est privée. Vous devez en faire la demande pour y accéder.</p>
        <button onClick={handleDemandeAcces}>Demander accès</button>
      </div>
    );
  }

  if (!editable && accessStatus !== "granted") {
    return <div>Accès non autorisé.</div>;
  }

  const emptySlots = Math.max(0, MAX_PHOTOS - photoList.length);

  return (
    <div className="profil-section">
      <h3 className="profil-section-title">Galerie privée</h3>

      <div className="gallery-grid">
        {photoList.map((photo, index) => (
          <div className="gallery-slot filled" key={photo.id || index}>
            {editable && (
              <button
                className="delete-button"
                onClick={() => handleDelete(photo.id)}
              >
                <Trash2 size={16} />
              </button>
            )}

            <img
              src={presignedUrls[photo.id] || "/default.jpg"}
              alt={`Photo ${index + 1}`}
              onClick={() => setCurrentIndex(index)}
              style={{ cursor: "zoom-in" }}
            />
          </div>
        ))}

        {editable &&
          emptySlots > 0 &&
          Array.from({ length: emptySlots }).map((_, idx) => (
            <div className="gallery-slot empty" key={`empty-${idx}`}>
              {galerieId ? (
                <PhotoUploader
                  isGallery
                  galerieId={galerieId}
                  onUpload={handleNewPhoto}
                  hidePlus
                />
              ) : (
                <span>Préparation de la galerie…</span>
              )}
            </div>
          ))}
      </div>

      {currentIndex !== null && photoList[currentIndex] && (
        <div className="lightbox" onClick={() => setCurrentIndex(null)}>
          <div
            className="lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="lightbox-close"
              onClick={() => setCurrentIndex(null)}
            >
              <X size={24} />
            </button>

            {currentIndex > 0 && (
              <button
                className="lightbox-prev"
                onClick={() => setCurrentIndex((i) => i - 1)}
              >
                <ChevronLeft size={32} />
              </button>
            )}

            {currentIndex < photoList.length - 1 && (
              <button
                className="lightbox-next"
                onClick={() => setCurrentIndex((i) => i + 1)}
              >
                <ChevronRight size={32} />
              </button>
            )}

            <img
              src={presignedUrls[photoList[currentIndex].id] || "/default.jpg"}
              alt="Agrandissement"
            />
          </div>
        </div>
      )}
    </div>
  );
}
