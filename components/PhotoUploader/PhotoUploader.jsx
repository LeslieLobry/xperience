'use client';

import { useRef, useState } from 'react';
import "../PhotoUploader/PhotoUploader.css";
import { Camera, Plus } from 'lucide-react';

export default function PhotoUploader({ currentUrl, onUpload, isGallery = false }) {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(currentUrl);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    const res = await fetch(isGallery ? '/api/upload-gallery-photo' : '/api/upload-photo', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (res.ok) {
      const data = await res.json();
      setPreview(data.photoUrl);
      if (onUpload) onUpload(data);
      else location.reload(); // fallback
    } else {
      alert("Erreur lors de l'envoi de la photo.");
    }
  };

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div
      className={`photo-upload-contenant ${isGallery ? 'gallery-mode' : ''}`}
      onClick={handleClick}
    >
      {preview ? (
        <div className="photo-preview-wrapper">
          <img src={preview} alt="Photo" className="photo-preview" />
          {!isGallery && (
            <label htmlFor="photo-upload" className="camera-label" title="Changer la photo">
              <Camera className="camera-icon" />
            </label>
          )}
        </div>
      ) : (
        isGallery && (
          <div className="gallery-placeholder">
            <Plus size={32} color="#ccc" />
          </div>
        )
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
