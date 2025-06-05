'use client';

import { useRef, useState } from 'react';
import "../PhotoUploader/PhotoUploader.css";
import { Camera, Plus } from 'lucide-react';

export default function PhotoUploader({ currentUrl, onUpload, isGallery = false, galerieId }) {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(currentUrl);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    // Gestion des différents endpoints selon le contexte
    // Galerie privée : /api/galeries-privees/[id]/photos (avec galerieId)
    // Galerie publique : /api/upload-gallery-photo (isGallery = true, mais sans galerieId)
    // Photo de profil : /api/upload-photo (isGallery = false)
    let endpoint;
    if (isGallery && galerieId) {
      endpoint = `/api/galeries-privees/${galerieId}/photos`;
      formData.append('galerieId', galerieId); // optionnel ici mais peut être utile côté serveur
    } else if (isGallery && !galerieId) {
      endpoint = '/api/upload-gallery-photo';
    } else {
      endpoint = '/api/upload-photo';
    }

    console.log("Uploading photo to:", endpoint);
    for (const [key, value] of formData.entries()) {
      console.log(`FormData field: ${key}`, value);
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      console.log("Upload response data:", data);

      if (isGallery) {
        // Mode galerie (publique ou privée) : on passe l'objet photo complet
        if (onUpload) onUpload(data);
      } else {
        // Mode photo de profil : on récupère l'URL et met à jour preview
        const url = data.photoUrl || data.url;
        setPreview(url);
        if (onUpload) onUpload(url);
      }
    } else {
      alert("Erreur lors de l'envoi de la photo.");
      console.error("Upload failed", await res.text());
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`photo-upload-contenant ${isGallery ? 'gallery-mode' : ''}`}
      onClick={handleClick}
    >
      {!isGallery && preview && (
        <div className="photo-preview-wrapper">
          <img src={preview} alt="Photo" className="photo-preview" />
          <label htmlFor="photo-upload" className="camera-label" title="Changer la photo">
            <Camera className="camera-icon" />
          </label>
        </div>
      )}

      {isGallery && (
        <div className="gallery-placeholder">
          <Plus size={32} color="#ccc" />
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ visibility: 'hidden', width: 0, height: 0 }}
        onChange={handleFileChange}
      />
    </div>
  );
}
