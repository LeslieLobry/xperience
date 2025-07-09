import { useRef, useState, useEffect } from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import "./ChatInput.css";

export default function ChatInput({
  utilisateur,
  conversationId,
  texte,
  setTexte,
  onMessageSent,
  onTyping,
  startRecording,
  stopRecording,
  recording,
}) {
  // ... (tes states existants)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  // pour l'image upload classique
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  // -- CAMERA / WEBCAM
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);

  // Ouvre la caméra
  const handleOpenCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setShowCamera(true);
    } catch (err) {
      alert("Impossible d'accéder à la caméra.");
      setShowCamera(false);
    }
  };

  // Stoppe la caméra
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  // Quand la caméra s’ouvre, attache le flux vidéo
  useEffect(() => {
    if (showCamera && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
    // Clean up à la fermeture du composant
    return () => stopCamera();
    // eslint-disable-next-line
  }, [showCamera, cameraStream]);

  // Capture une photo de la webcam/caméra
  const handleTakePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 360;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        setImagePreview(URL.createObjectURL(blob));
        setImageFile(new File([blob], "photo.jpg", { type: "image/jpeg" }));
        stopCamera();
      }
    }, "image/jpeg", 0.90);
  };

  // --- UPLOAD IMAGE DEPUIS CAMERA OU FICHIER ---
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    setImageFile(file);
    e.target.value = "";
  };

  // Supprime le preview image
  const removePreview = () => {
    setImagePreview(null);
    setImageFile(null);
  };

  // Submit : envoie texte OU image
  const handleSubmit = async (e) => {
    e.preventDefault();
    // Envoi d’image (fichier classique ou photo prise)
    if (imageFile) {
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("conversationId", conversationId);
      formData.append("type", "IMAGE");
      if (texte) formData.append("contenu", texte);
      await onMessageSent(formData, "IMAGE");
      setImageFile(null);
      setImagePreview(null);
      setTexte("");
      return;
    }
    // Sinon message texte
    if (!texte.trim()) return;
    await onMessageSent(texte, "TEXTE");
    setTexte("");
  };

  return (
    <>
      {/* CAMERA MODAL */}
      {showCamera && (
        <div className="camera-modal" style={{
          position: "fixed", zIndex: 1002, left: 0, top: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column"
        }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{ width: 340, height: 250, borderRadius: 14, background: "#222" }}
          />
          <div style={{ marginTop: 18 }}>
            <button onClick={handleTakePhoto} style={{ fontSize: 22, marginRight: 24 }}>📸 Prendre la photo</button>
            <button onClick={stopCamera} style={{ fontSize: 18, color: "#fff", background: "#e53" }}>Annuler</button>
          </div>
        </div>
      )}

      {/* FORM PRINCIPAL */}
      <form className="chat-input" onSubmit={handleSubmit}>
        <div className="input-wrapper" style={{ alignItems: "center" }}>
          {/* Bouton prendre photo */}
          <button
            type="button"
            className="chat-input-photo-btn"
            style={{ fontSize: "1.4em", marginRight: 5 }}
            onClick={handleOpenCamera}
            title="Prendre une photo"
          >
            📸
          </button>
          {/* Upload classique */}
          <input
            type="file"
            accept="image/*"
            id="file-upload"
            style={{ display: "none" }}
            onChange={handleImageUpload}
          />
          <label htmlFor="file-upload" className="chat-input-photo-btn" title="Envoyer une photo" style={{ cursor: "pointer", fontSize: "1.3em", marginRight: 6 }}>
            🖼️
          </label>
          {/* Aperçu de la photo (fichier ou caméra) */}
          {imagePreview && (
            <div style={{ position: "relative", marginRight: 8 }}>
              <img src={imagePreview} alt="Aperçu" style={{
                maxWidth: 60, maxHeight: 60, borderRadius: 8,
                objectFit: "cover", border: "1px solid #ccc"
              }} />
              <button type="button" style={{
                position: "absolute", top: -8, right: -8,
                background: "#fff", border: "1px solid #ccc", borderRadius: "50%",
                width: 22, height: 22, cursor: "pointer", fontSize: 12, color: "#d00"
              }} onClick={removePreview} title="Supprimer">
                ×
              </button>
            </div>
          )}

          <textarea
            className="input-text"
            value={texte}
            placeholder="Écris un message…"
            onChange={e => { setTexte(e.target.value); if (onTyping) onTyping(); }}
            rows={1}
            style={{ resize: "none" }}
          />
          {/* (Ajoute ici tes boutons audio, emoji, etc) */}
        </div>
        <button type="submit" className="message-btn">
          {imageFile ? "Envoyer l'image" : "Envoyer"}
        </button>
      </form>

      {/* Emoji picker */}
      {showEmojiPicker && (
        <div className="emoji-picker-container">
          <Picker
            data={data}
            onEmojiSelect={(emoji) => {
              setTexte((prev) => prev + emoji.native);
              setShowEmojiPicker(false);
            }}
            theme="light"
          />
        </div>
      )}
    </>
  );
}
