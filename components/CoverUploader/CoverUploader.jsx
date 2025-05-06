"use client";

import { useRef } from "react";
import { Camera } from "lucide-react";
import "./CoverUploader.css";

export default function CoverUploader({ currentUrl, onUpload }) {
  const fileInputRef = useRef(null);

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
      if (onUpload) onUpload(data.coverUrl);
    } else {
      alert("Erreur lors de l'envoi de la couverture.");
    }
  };

  return (
    <>
      <label htmlFor="cover-upload" className="cover-upload-icon" title="Changer la couverture">
        <Camera />
      </label>
      <input
        id="cover-upload"
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </>
  );
}
