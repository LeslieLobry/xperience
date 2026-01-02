"use client";

import { useRef, useState, useEffect } from "react";
import { toast } from "react-toastify";
import "../PhotoUploader/PhotoUploader.css";
import { Camera, Plus } from "lucide-react";
import heic2any from "heic2any";

// Détecte si c'est une vidéo ou une image
function isVideoFile(fileOrUrl) {
  if (!fileOrUrl) return false;
  if (typeof fileOrUrl === "string") return /\.(mp4|webm|ogg|mov)$/i.test(fileOrUrl);
  if (fileOrUrl.type) return fileOrUrl.type.startsWith("video/");
  return false;
}

// ✅ HEIC/HEIF detection (même si file.type est vide)
function isHeicFile(file) {
  if (!file) return false;
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return (
    type === "image/heic" ||
    type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

function safeNameToJpg(originalName = "photo.heic") {
  return originalName.replace(/\.(heic|heif)$/i, "") + ".jpg";
}

// ✅ Convertit HEIC -> JPEG (retourne un File JPEG)
async function convertHeicToJpeg(file) {
  const output = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.85,
  });

  const blob = Array.isArray(output) ? output[0] : output;

  return new File([blob], safeNameToJpg(file.name), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
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
  isOwnProfile = false,

  // ✅ NOUVEAU : permet de masquer le "+"
  hidePlus = false,
}) {
  const fileInputRef = useRef(null);
  const { preview, previewType, setPreview, setPreviewType } = usePresignedPreview(currentUrl);

  const openPicker = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // Quand l'utilisateur choisit un fichier
  const handleFileChange = async (e) => {
    let file = e.target.files?.[0];
    if (!file) return;

    try {
      // ✅ Conversion HEIC/HEIF -> JPEG AVANT tout le reste
      if (isHeicFile(file)) {
        toast.info("Conversion HEIC en JPEG…");
        file = await convertHeicToJpeg(file);
      }

      // 🚩 Vérification taille fichier AVANT upload
      const MAX_SIZE_MB = 4;
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error("Photo trop volumineuse !\nLa taille maximale autorisée est 4 Mo.");
        return;
      }

      // ✅ Petit garde-fou (optionnel mais utile)
      if (!isVideoFile(file) && !(file.type || "").startsWith("image/")) {
        toast.error("Fichier non supporté.");
        return;
      }

      // Preview locale instantanée
      if (isVideoFile(file)) {
        setPreviewType("video");
        setPreview(URL.createObjectURL(file));
      } else {
        setPreviewType("image");
        setPreview(URL.createObjectURL(file));
      }

      const formData = new FormData();
      formData.append("photo", file);

      // ✅ Galerie publique : inchangé
      if (isGallery && isPublic) {
        formData.append("isPublic", "true");
      }

      // ✅ Galerie privée : check simplifié, ne casse pas les IDs string
      if (isGallery && !isPublic) {
        if (!galerieId) {
          toast.error("Erreur : galerie privée introuvable.");
          console.error("PhotoUploader → galerieId manquant pour galerie privée :", galerieId);
          return;
        }
        formData.append("galerieId", String(galerieId));
      }

      const res = await fetch("/api/upload-photo", {
        method: "POST",
        body: formData,
        credentials: "include",
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
        toast.error(message);
        return;
      }

      const data = await res.json();
      const url = data.photoUrl;

      // Après upload, on force la preview via presigned URL (pour le S3 privé)
      if (typeof url === "string" && !url.startsWith("http")) {
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
      console.error("Erreur conversion/upload :", err);
      toast.error("Impossible de traiter cette photo (HEIC?). Essaie en JPEG.");
    } finally {
      // reset input sinon re-upload même fichier ne déclenche pas change
      e.target.value = "";
    }
  };

  return (
    <div className={`photo-upload-contenant ${isGallery ? "gallery-mode" : ""}`}>
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
                e.target.src = "/default.jpg";
              }}
            />
          )}

          {isOwnProfile && (
            <label
              htmlFor="photo-upload"
              className="camera-label"
              title="Changer la photo"
              onClick={(e) => e.stopPropagation()}
            >
              <Camera className="camera-icon" />
            </label>
          )}
        </div>
      )}

      {isGallery && (
        <div
          className="gallery-placeholder gallery-placeholder-full"
          onClick={openPicker}
          tabIndex={0}
          role="button"
          title="Ajouter une photo"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") openPicker();
          }}
        >
          {/* ✅ plus de + si hidePlus */}
          {!hidePlus && <Plus size={32} color="#ccc" />}
        </div>
      )}

      <input
        id="photo-upload"
        type="file"
        ref={fileInputRef}
        // ✅ Ajout .heic/.heif en plus (certains navigateurs les filtrent sinon)
        accept="image/*,video/*,.heic,.heif"
        style={{ visibility: "hidden", width: 0, height: 0 }}
        onChange={handleFileChange}
      />
    </div>
  );
}
