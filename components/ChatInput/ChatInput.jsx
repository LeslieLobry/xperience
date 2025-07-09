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
}) {
  // --- AUDIO
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const audioChunks = useRef([]);
  const textareaRef = useRef();

  function autoResize() {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = ta.scrollHeight + "px";
    }
  }

  useEffect(() => {
    autoResize();
  }, [texte]);

  // --- EMOJI
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // --- IMAGE
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [ephemere, setEphemere] = useState(false);

  // --- CAMERA / WEBCAM
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);

  // --- MICRO / AUDIO ---
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new window.MediaRecorder(stream);
      audioChunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.current.push(e.data);
        }
      };
      recorder.onstop = () => {
        if (audioChunks.current.length) {
          const blob = new Blob(audioChunks.current, { type: "audio/webm" });
          setAudioBlob(blob);
          setAudioUrl(URL.createObjectURL(blob));
        } else {
          setAudioBlob(null);
          setAudioUrl(null);
        }
        audioChunks.current = [];
        stream.getTracks().forEach((track) => track.stop());
      };

      setMediaRecorder(recorder);
      setIsRecording(true);
      recorder.start();
    } catch (err) {
      alert("Impossible d'accéder au micro.");
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.requestData?.();
      setTimeout(() => {
        mediaRecorder.stop();
        setIsRecording(false);
      }, 100);
    }
  };

  const removeAudioPreview = () => {
    setAudioBlob(null);
    setAudioUrl(null);
  };

  // --- CAMERA ---
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

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  useEffect(() => {
    if (showCamera && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
    return () => stopCamera();
  }, [showCamera, cameraStream]);

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
    }, "image/jpeg", 0.9);
  };

  // --- UPLOAD IMAGE ---
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    setImageFile(file);
    e.target.value = "";
  };

  const removePreview = () => {
    setImagePreview(null);
    setImageFile(null);
  };

  // --- SUBMIT LOGIC ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Image
    if (imageFile) {
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("conversationId", conversationId);
      formData.append("type", ephemere ? "EPHEMERE" : "IMAGE");
      if (texte) formData.append("contenu", texte);
      console.log("[ChatInput] Envoi image avec type", ephemere ? "EPHEMERE" : "IMAGE");
      await onMessageSent(formData);
      setImageFile(null);
      setImagePreview(null);
      setTexte("");
      setEphemere(false);
      return;
    }

    // Audio
    if (audioBlob) {
      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.webm");
      formData.append("conversationId", conversationId);
      formData.append("type", ephemere ? "EPHEMERE" : "AUDIO");
      console.log("[ChatInput] Envoi audio avec type", ephemere ? "EPHEMERE" : "AUDIO");
      await onMessageSent(formData);
      setAudioBlob(null);
      setAudioUrl(null);
      setTexte("");
      setEphemere(false);
      return;
    }

    // Texte
    if (!texte.trim()) return;
    console.log("[ChatInput] Envoi texte avec type", ephemere ? "EPHEMERE" : "TEXTE");
    await onMessageSent(texte, ephemere ? "EPHEMERE" : "TEXTE");
    setTexte("");
    setEphemere(false);
  };

  // --- Notification éphémère ---
  const [showEphemereNotif, setShowEphemereNotif] = useState(false);

  useEffect(() => {
    if (showEphemereNotif) {
      const timer = setTimeout(() => {
        setShowEphemereNotif(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showEphemereNotif]);

  const handleSubmitWithNotif = async (e) => {
    if (ephemere) setShowEphemereNotif(true);
    await handleSubmit(e);
  };

  return (
    <>
      {/* CAMERA MODAL */}
      {showCamera && (
        <div
          className="camera-modal"
          style={{
            position: "fixed",
            zIndex: 1002,
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{
              width: 340,
              height: 250,
              borderRadius: 14,
              background: "#222",
            }}
          />
          <div style={{ marginTop: 18 }}>
            <button
              onClick={handleTakePhoto}
              style={{ fontSize: 22, marginRight: 24 }}
            >
              📸 Prendre la photo
            </button>
            <button
              onClick={stopCamera}
              style={{ fontSize: 18, color: "#fff", background: "#e53" }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Notification éphémère */}
      {showEphemereNotif && (
        <div
          style={{
            position: "fixed",
            bottom: 10,
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#e53",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: 25,
            fontWeight: "bold",
            zIndex: 1100,
            boxShadow: "0 0 10px rgba(229, 83, 83, 0.7)",
          }}
        >
          Photo éphémère envoyée ! Elle disparaîtra dans 5 secondes…
        </div>
      )}

      {/* FORM PRINCIPAL */}
      <form className="chat-input" onSubmit={handleSubmitWithNotif}>
        <div className="input-wrapper" style={{ alignItems: "center" }}>
          {/* Bouton prendre photo */}
          {/* <button
            type="button"
            className="chat-input-photo-btn"
            style={{ fontSize: "1.4em", marginRight: 5 }}
            onClick={handleOpenCamera}
            title="Prendre une photo"
          >
            📸
          </button> */}

          {/* Upload classique */}
          <input
            type="file"
            accept="image/*"
            id="file-upload"
            style={{ display: "none" }}
            onChange={handleImageUpload}
          />
          <label
            htmlFor="file-upload"
            className="chat-input-photo-btn"
            title="Envoyer une photo"
            style={{ cursor: "pointer", fontSize: "1.3em", marginRight: 6 }}
          >
            🖼️
          </label>

          {/* Bouton Snap (message éphémère) */}
          <button
            type="button"
            className={`chat-input-ephemere-btn${ephemere ? " active" : ""}`}
            style={{
              marginRight: 8,
              background: ephemere ? "#ffe0b3" : "#eee",
              border: "1px solid #e53",
              borderRadius: 5,
              color: ephemere ? "#e53" : "#555",
              cursor: "pointer",
              padding: "2px 6px",
              fontWeight: "bold",
            }}
            onClick={() => setEphemere((v) => !v)}
            title="Message éphémère (Snap)"
          >
            🕒 éphémère
          </button>

          {/* Aperçu image */}
          {imagePreview && (
            <div style={{ position: "relative", marginRight: 8 }}>
              <img
                src={imagePreview}
                alt="Aperçu"
                style={{
                  maxWidth: 60,
                  maxHeight: 60,
                  borderRadius: 8,
                  objectFit: "cover",
                  border: "1px solid #ccc",
                }}
              />
              {ephemere && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 2,
                    left: 2,
                    backgroundColor: "#e53",
                    color: "#fff",
                    padding: "2px 4px",
                    fontSize: 10,
                    borderRadius: 3,
                  }}
                >
                  Photo éphémère
                </div>
              )}
              <button
                type="button"
                style={{
                  position: "absolute",
                  top: -8,
                  right: -8,
                  background: "#fff",
                  border: "1px solid #ccc",
                  borderRadius: "50%",
                  width: 22,
                  height: 22,
                  cursor: "pointer",
                  fontSize: 12,
                  color: "#d00",
                }}
                onClick={removePreview}
                title="Supprimer"
              >
                ×
              </button>
            </div>
          )}

          {/* Aperçu audio */}
          {audioUrl && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginLeft: 8,
              }}
            >
              <audio controls src={audioUrl} style={{ marginRight: 8 }} />
              <button
                type="button"
                onClick={removeAudioPreview}
                title="Supprimer l'audio"
                style={{
                  color: "#d00",
                  fontSize: 18,
                  border: "none",
                  background: "none",
                }}
              >
                ×
              </button>
            </div>
          )}

          <textarea
            className="input-text"
            ref={textareaRef}
            value={texte}
            placeholder="Écris un message…"
            onChange={(e) => {
              setTexte(e.target.value);
              if (onTyping) onTyping();
              autoResize();
            }}
            onInput={autoResize}
            rows={1}
            style={{
              resize: "none",
              overflow: "hidden",
              minHeight: 38,
              maxHeight: 130,
            }}
          />

          {/* MICRO */}
          <button
            type="button"
            className="chat-input-mic-btn"
            style={{ fontSize: "1.3em", marginLeft: 6 }}
            onClick={isRecording ? stopAudioRecording : startAudioRecording}
            title={
              isRecording
                ? "Arrêter l'enregistrement"
                : "Envoyer un message audio"
            }
          >
            {isRecording ? "⏹️" : "🎤"}
          </button>

          {/* EMOJI */}
          <button
            type="button"
            className="chat-input-emoji-btn"
            style={{ fontSize: "1.3em", marginLeft: 6 }}
            onClick={() => setShowEmojiPicker((v) => !v)}
            title="Insérer un emoji"
          >
            😃
          </button>
        </div>

        <button
          type="submit"
          className="message-btn"
          disabled={
            !(
              (audioBlob && !isRecording) ||
              imageFile ||
              (texte && texte.trim())
            )
          }
        >
          {imageFile
            ? "Envoyer l'image"
            : audioBlob
            ? "Envoyer l'audio"
            : "Envoyer"}
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
