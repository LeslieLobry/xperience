'use client';

import { useRef, useState } from 'react';
import "../PhotoUploader/PhotoUploader.css"
import { Camera } from 'lucide-react';


export default function PhotoUploader({ currentUrl, onUpload }) {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(currentUrl);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    const res = await fetch('/api/upload-photo', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (res.ok) {
      const data = await res.json();
      setPreview(data.photoUrl);
      if (onUpload) onUpload(data.photoUrl);
    } else {
      alert("Erreur lors de l'envoi de la photo.");
    }
  };

  return (
    <div className="photo-upload-contenant">
      {preview && (
        <div className="photo-preview-wrapper">
          <img
            src={preview}
            alt="Photo de profil"
            className="photo-preview"
          />
          <label htmlFor="photo-upload" className="camera-label" title="Changer la photo">
            <Camera className="camera-icon" />
          </label>
      <input
        id="photo-upload"
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
        </div>
      )}

    </div>
  );
}