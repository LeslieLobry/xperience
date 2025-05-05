"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import "./CoverUploader.css";

export default function CoverUploader({ currentUrl, onUpload }) {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(currentUrl);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("cover", file);

    const res = await fetch("/api/upload-cover", {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (res.ok) {
      const data = await res.json();
      setPreview(data.coverUrl);
      if (onUpload) onUpload(data.coverUrl);
    } else {
      alert("Erreur lors de l'envoi de la couverture.");
    }
  };

  return (
    <div className="cover-upload-container">
      {preview && (
        <div className="cover-preview-wrapper">
          <img src={preview} alt="Image de couverture" className="cover-preview" />
          <label htmlFor="cover-upload" className="cover-upload-icon" title="Changer la couverture">
            <Camera />
          </label>
        </div>
      )}
      <input
        id="cover-upload"
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </div>
  );
}
