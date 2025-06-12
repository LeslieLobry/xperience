'use client';

import { useRef, useState } from 'react';
import "../PhotoUploader/PhotoUploader.css";
import { Camera, Plus } from 'lucide-react';

export default function PhotoUploader({
  currentUrl,
  onUpload,
  isGallery = false,
  galerieId,
  isPublic = false,
  isOwnProfile = false
}) {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(currentUrl);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    let uploadUrl = '/api/upload-photo';

    if (isGallery && isPublic) {
      // Galerie publique → upload-photo avec flag
      formData.append('isPublic', 'true');
    }

    if (isGallery && !isPublic) {
      // Galerie privée
      if (!galerieId) {
        console.error("galerieId manquant pour galerie privée");
        return alert("Erreur : galerie privée introuvable.");
      }
      uploadUrl = `/api/galeries-privees/${galerieId}/photos`;
    }

    try {
      const res = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        const url = data.photoUrl?.startsWith("/") ? data.photoUrl : `/${data.photoUrl}`;
        setPreview(url);
        if (onUpload) onUpload(isGallery ? data : url);
      } else {
        const errorText = await res.text();
        console.error("Upload failed:", errorText);
        alert("Erreur lors de l'envoi de la photo.");
      }
    } catch (err) {
      console.error("Erreur réseau:", err);
      alert("Erreur réseau pendant l'upload.");
    }
  };

  const handleClick = () => {
    if (!isGallery && !isOwnProfile) return;
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`photo-upload-contenant ${isGallery ? 'gallery-mode' : ''}`}
      onClick={handleClick}
    >
      {!isGallery && preview && (
        <div className="photo-preview-wrapper">
          <img
            src={preview || "/images/default-avatar.png"}
            alt="Photo de profil"
            className="photo-preview"
          />
          {isOwnProfile && (
            <label htmlFor="photo-upload" className="camera-label" title="Changer la photo">
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
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ visibility: 'hidden', width: 0, height: 0 }}
        onChange={handleFileChange}
      />
    </div>
  );
}
