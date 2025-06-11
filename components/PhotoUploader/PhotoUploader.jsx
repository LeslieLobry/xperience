'use client';

import { useRef, useState } from 'react';
import "../PhotoUploader/PhotoUploader.css";
import { Camera, Plus } from 'lucide-react';

export default function PhotoUploader({
  currentUrl,
  onUpload,
  isGallery = false,
  galerieId,
  isOwnProfile = false
}) {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(currentUrl);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    // Choix de l'endpoint
    let endpoint;
    if (isGallery && galerieId) {
      endpoint = `/api/galeries-privees/${galerieId}/photos`;
    } else if (isGallery && !galerieId) {
      endpoint = '/api/upload-gallery-photo';
    } else {
      endpoint = '/api/upload-photo';
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      const url = data.photoUrl || data.url;
      setPreview(url);
      if (onUpload) onUpload(isGallery ? data : url);
    } else {
      alert("Erreur lors de l'envoi de la photo.");
      console.error("Upload failed", await res.text());
    }
  };

  const handleClick = () => {
    if (isOwnProfile) {
      fileInputRef.current?.click();
    }
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
