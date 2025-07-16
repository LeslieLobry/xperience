'use client';

import { useRef, useState } from 'react';
import "../PhotoUploader/PhotoUploader.css";
import { Camera, Plus } from 'lucide-react';

function isVideoFile(fileOrUrl) {
  if (!fileOrUrl) return false;
  if (typeof fileOrUrl === "string")
    return /\.(mp4|webm|ogg|mov)$/i.test(fileOrUrl);
  // Côté input file
  if (fileOrUrl.type) return fileOrUrl.type.startsWith("video/");
  return false;
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
  const [preview, setPreview] = useState(currentUrl);
  const [previewType, setPreviewType] = useState(isVideoFile(currentUrl) ? "video" : "image");

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Détecte image ou vidéo côté preview local
    if (isVideoFile(file)) {
      setPreviewType("video");
      setPreview(URL.createObjectURL(file));
    } else {
      setPreviewType("image");
      setPreview(URL.createObjectURL(file));
    }

    const formData = new FormData();
    formData.append('photo', file);

    if (isGallery && isPublic) {
      formData.append('isPublic', 'true');
    }

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
        const errorText = await res.text();
        console.error("Upload échoué :", errorText);
        alert("Erreur lors de l'envoi du fichier.");
        return;
      }

      const data = await res.json();
      const url = data.photoUrl;

      setPreview(url);
      setPreviewType(isVideoFile(file) ? "video" : "image");
      if (onUpload) onUpload(isGallery ? data : url);
    } catch (err) {
      console.error("Erreur réseau :", err);
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
          {previewType === "video" ? (
            <video
              src={preview}
              controls
              className="photo-preview"
              style={{ maxWidth: "100%", maxHeight: "160px" }}
            />
          ) : (
            <img
              src={preview || "/images/default-avatar.png"}
              alt="Photo de profil"
              className="photo-preview"
            />
          )}
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
