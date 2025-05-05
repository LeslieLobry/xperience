'use client';

import { useRef, useState } from 'react';

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
      alert('Erreur lors de l\'envoi de la photo.');
    }
  };

  return (
    <div>
      {preview && (
        <img
          src={preview}
          alt="Photo de profil"
          width={120}
          style={{ borderRadius: '10px', marginTop: '1rem' }}
        />
      )}
      <br />
      <button onClick={() => fileInputRef.current.click()}>
        Changer la photo
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
}
