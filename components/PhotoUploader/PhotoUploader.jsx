'use client';

import { useRef, useState, useEffect } from 'react';
import "../PhotoUploader/PhotoUploader.css";
import { Camera, Plus } from 'lucide-react';

// Détecte si c'est une vidéo ou une image
function isVideoFile(fileOrUrl) {
  if (!fileOrUrl) return false;
  if (typeof fileOrUrl === "string")
    return /\.(mp4|webm|ogg|mov)$/i.test(fileOrUrl);
  if (fileOrUrl.type) return fileOrUrl.type.startsWith("video/");
  return false;
}

// Custom hook : charge la presigned URL si besoin
function usePresignedPreview(url) {
  const [preview, setPreview] = useState(url);
  const [previewType, setPreviewType] = useState(isVideoFile(url) ? "video" : "image");

  useEffect(() => {
    if (!url) {
      setPreview("/default.jpg");
      setPreviewType("image");
      return;
    }
    if (typeof url === "string" && url.startsWith("http")) {
      setPreview(url);
      setPreviewType(isVideoFile(url) ? "video" : "image");
      return;
    }
    // Si c'est une clé S3, on fetch la presigned URL
    (async () => {
      try {
        const res = await fetch("/api/photos/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: url }),
        });
        const data = await res.json();
        setPreview(data.url || "/default.jpg");
        setPreviewType(isVideoFile(url) ? "video" : "image");
      } catch {
        setPreview("/default.jpg");
        setPreviewType("image");
      }
    })();
  }, [url]);

  return { preview, previewType, setPreview, setPreviewType };
}

export default function PhotoUploader({
  currentUrl,
  onUpload,
  isGallery = false,
  galerieId,
  isPublic = false,
  isOwnProfile = false
}) {
  const fileInputRef = useRef(null);
  const { preview, previewType, setPreview, setPreviewType } = usePresignedPreview(currentUrl);

  // Quand l'utilisateur choisit un fichier
  const handleFileChange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Preview locale instantanée
  if (isVideoFile(file)) {
    setPreviewType("video");
    setPreview(URL.createObjectURL(file));
  } else {
    setPreviewType("image");
    setPreview(URL.createObjectURL(file));
  }

  const formData = new FormData();
  formData.append('image', file);

  if (isGallery && isPublic) formData.append('isPublic', 'true');
  if (isGallery && !isPublic) {
    if (!galerieId || isNaN(parseInt(galerieId))) {
      console.error("galerieId invalide pour galerie privée");
      return alert("Erreur : galerie privée introuvable.");
    }
    formData.append('galerieId', galerieId.toString());
  }

  try {
    const res = await fetch('/api/upload-photo', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!res.ok) {
      let message = "Erreur lors de l'envoi du fichier.";
      try {
        const json = await res.json();
        message = json.message || message;
      } catch (err) {
        console.error("Erreur lors de la lecture de la réponse JSON :", err);
      }
      console.error("Upload échoué :", message);
      alert(message);
      return;
    }

    const data = await res.json();
    // **Correction ici : utiliser data.path au lieu de data.photoUrl**
    const url = data.path || data.photoUrl;

    // Après upload, on force la preview via presigned URL (pour le S3 privé)
    if (typeof url === "string" && !url.startsWith("http")) {
      // Nouvelle clé => on re-fetch la presigned
      const r = await fetch("/api/photos/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: url }),
      });
      const d = await r.json();
      setPreview(d.url || "/default.jpg");
      setPreviewType(isVideoFile(url) ? "video" : "image");
    } else {
      setPreview(url);
      setPreviewType(isVideoFile(url) ? "video" : "image");
    }

    if (onUpload) onUpload(isGallery ? data : url);
  } catch (err) {
    console.error("Erreur réseau :", err);
    alert("Erreur réseau pendant l'upload.");
  }
};

  return (
    <div className={`photo-upload-contenant ${isGallery ? 'gallery-mode' : ''}`}>
      {!isGallery && preview && (
        <div className="photo-preview-wrapper">
          {previewType === "video" ? (
            <video
              src={preview}
              controls
              className="photo-preview"
              style={{ maxWidth: "100%", maxHeight: "160px" }}
            />
          ) : (
            <img
              src={preview || "/default.jpg"}
              alt="Photo de profil"
              className="photo-preview"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/default.jpg';
              }}
            />
          )}
          {isOwnProfile && (
            // Uniquement l'icône déclenche l'input file :
            <label
              htmlFor="photo-upload"
              className="camera-label"
              title="Changer la photo"
              style={{ cursor: "pointer" }}
              onClick={e => e.stopPropagation()} // <- pour éviter toute propagation indésirable
            >
              <Camera className="camera-icon" />
            </label>
          )}
        </div>
      )}

      {isGallery && (
        <div className="gallery-placeholder">
          <Plus size={32} color="#ccc" />
        </div>
      )}

      <input
        id="photo-upload"
        type="file"
        ref={fileInputRef}
        accept="image/*,video/*"
        style={{ visibility: 'hidden', width: 0, height: 0 }}
        onChange={handleFileChange}
      />
    </div>
  );
}
