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
  // --- COUPLE: Gestion prénoms & qui parle
  const [pr1, setPr1] = useState("");
  const [pr2, setPr2] = useState("");
  const [loadingPrenoms, setLoadingPrenoms] = useState(false);
  const [prenomsOK, setPrenomsOK] = useState(false);
  const [membreParlant, setMembreParlant] = useState("couple");

  // Fetch prénoms si utilisateur couple
  useEffect(() => {
    if (utilisateur.type !== "couple") return;
    setLoadingPrenoms(true);
    fetch(`/api/prenoms-couple?conversationId=${conversationId}`)
      .then(res => res.json())
      .then(data => {
        if (data.prenoms) {
          setPr1(data.prenoms.prenom1 || "");
          setPr2(data.prenoms.prenom2 || "");
          setPrenomsOK(true);
        } else {
          setPrenomsOK(false);
        }
      })
      .finally(() => setLoadingPrenoms(false));
  }, [conversationId, utilisateur.type]);

  // Submit prénoms pour le couple
  const handlePrenomsSubmit = async (e) => {
    e.preventDefault();
    if (!pr1.trim() || !pr2.trim()) return;
    setLoadingPrenoms(true);
    const res = await fetch("/api/prenoms-couple", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId,
        prenom1: pr1,
        prenom2: pr2,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setPrenomsOK(true);
    }
    setLoadingPrenoms(false);
  };

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
  const emoticonsMap = {
    ":)": "😊",
    ":-)": "😊",
    ":(": "😢",
    ":-(": "😢",
    ";)": "😉",
    ":D": "😄",
    ":-D": "😄",
    "<3": "❤️",
    ":p": "😛",
    ":-p": "😛",
    ":'(": "😭",
    ":o": "😮",
    ":-o": "😮",
  };
  function replaceEmoticonsWithEmojis(text) {
    return Object.keys(emoticonsMap).reduce(
      (acc, emoticon) => acc.split(emoticon).join(emoticonsMap[emoticon]),
      text
    );
  }

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

      // Ajout couple si besoin
      if (utilisateur.type === "couple" && prenomsOK) {
        formData.append("membreParlant", membreParlant);
        formData.append("prenom1", pr1);
        formData.append("prenom2", pr2);
      }

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

      // Ajout couple si besoin
      if (utilisateur.type === "couple" && prenomsOK) {
        formData.append("membreParlant", membreParlant);
        formData.append("prenom1", pr1);
        formData.append("prenom2", pr2);
      }

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

    if (utilisateur.type === "couple" && prenomsOK) {
  await onMessageSent({
    contenu: texte,
    type: ephemere ? "EPHEMERE" : "TEXTE",
    conversationId,
    prenomEnvoyeur: membreParlant === "couple" ? "Le couple" : membreParlant, // <---- ICI
    prenom1: pr1,
    prenom2: pr2,
  });
} else {
  await onMessageSent({
    contenu: texte,
    type: ephemere ? "EPHEMERE" : "TEXTE",
    conversationId,
  });
}
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
      {utilisateur.type === "couple" && !prenomsOK && (
        // Inputs pour entrer les prénoms
        <form className="chat-input" onSubmit={handlePrenomsSubmit} style={{ flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              type="text"
              className="input-prenom"
              placeholder="Prénom membre 1"
              value={pr1}
              onChange={e => setPr1(e.target.value)}
              style={{ width: 120 }}
              disabled={loadingPrenoms}
              autoFocus
            />
            <input
              type="text"
              className="input-prenom"
              placeholder="Prénom membre 2"
              value={pr2}
              onChange={e => setPr2(e.target.value)}
              style={{ width: 120 }}
              disabled={loadingPrenoms}
            />
            <button type="submit" disabled={loadingPrenoms || !pr1 || !pr2}>
              Valider
            </button>
          </div>
        </form>
      )}

      {/* CAMERA MODAL */}
      {showCamera && (
        <div className="camera-modal" style={{
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
        }}>
          <video ref={videoRef} autoPlay playsInline style={{
            width: 340,
            height: 250,
            borderRadius: 14,
            background: "#222",
          }} />
          <div style={{ marginTop: 18 }}>
            <button onClick={handleTakePhoto} style={{ fontSize: 22, marginRight: 24 }}>
              📸 Prendre la photo
            </button>
            <button onClick={stopCamera} style={{ fontSize: 18, color: "#fff", background: "#e53" }}>
              Annuler
            </button>
          </div>
        </div>
      )}
      {utilisateur.type === "couple" && prenomsOK && (
        <select
  className="select-membre"
  value={membreParlant}
  onChange={e => setMembreParlant(e.target.value)}
  style={{ marginRight: 8, marginBottom: 8 }}
>
  <option value={pr1}>{pr1}</option>
  <option value={pr2}>{pr2}</option>
  <option value="couple">Le couple</option>
</select>

      )}

      {/* Notification éphémère */}
      {showEphemereNotif && (
        <div style={{
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
        }}>
          Photo éphémère envoyée ! Elle disparaîtra dans 5 secondes…
        </div>
      )}

      {/* FORM PRINCIPAL */}
      <form className="chat-input" onSubmit={handleSubmitWithNotif}>
        <textarea className="input-text" ref={textareaRef} value={texte} placeholder="Écris un message…" onChange={(e) => {
          const value = e.target.value;
          const withEmojis = replaceEmoticonsWithEmojis(value);
          setTexte(withEmojis);
          if (onTyping) onTyping();
          autoResize();
        }}
          onInput={autoResize}
          rows={1}
          style={{
            resize: "none",
            overflow: "hidden",

          }}
        />
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
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-image-up-icon lucide-image-up"><path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21"/><path d="m14 19.5 3-3 3 3"/><path d="M17 22v-5.5"/><circle cx="9" cy="9" r="2"/></svg>
          </label>
          <button
            type="button"
            className={`chat-input-ephemere-btn${ephemere ? " active" : ""}`}
            onClick={() => setEphemere((v) => !v)}
            title="Message éphémère (Snap)"
          >
            <svg width="24px" height="24px" viewBox="0 0 1024 1024" fill="#e0c084" className="icon" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M834.4 92H189.6c-13.6 0-24-11.2-24-24 0-13.6 11.2-24 24-24h644.8c13.6 0 24 11.2 24 24 0.8 12.8-10.4 24-24 24zM866.4 992.8H158.4c-14.4 0-26.4-12-26.4-26.4 0-14.4 12-26.4 26.4-26.4h708c14.4 0 26.4 12 26.4 26.4 0 14.4-12 26.4-26.4 26.4z" fill="" /><path d="M766.4 666.4l-0.8-1.6c-40.8-71.2-95.2-117.6-152.8-145.6 57.6-28.8 111.2-74.4 152.8-145.6l0.8-1.6c40.8-70.4 68-166.4 72.8-294.4H792c-4 118.4-28.8 206.4-66.4 271.2l-0.8 0.8C678.4 432 626.4 476 559.2 496.8l-3.2 0.8h-0.8c-1.6 0.8-2.4 1.6-4 2.4l-0.8 0.8-1.6 1.6-1.6 1.6v0.8c-0.8 0.8-1.6 2.4-2.4 4l-0.8 0.8-1.6 5.6v8.8l1.6 5.6 0.8 0.8c0.8 1.6 1.6 2.4 2.4 4v0.8l1.6 1.6V536l1.6 0.8 0.8 0.8c0.8 0.8 2.4 1.6 4 2.4h0.8l3.2 1.6c68 21.6 119.2 64.8 166.4 146.4l0.8 1.6c20 33.6 35.2 74.4 47.2 121.6 2.4 13.6 11.2 43.2 12.8 81.6-37.6-33.6-141.6-57.6-266.4-59.2V464c1.6 0 2.4-0.8 4-1.6v-0.8l6.4-2.4h1.6c45.6-14.4 81.6-36.8 112-66.4 32-32 56.8-71.2 73.6-115.2 4.8-12-0.8-25.6-13.6-30.4-12-4.8-25.6 0.8-30.4 12.8v0.8c-14.4 36.8-35.2 71.2-62.4 98.4-24.8 24-54.4 43.2-92 54.4l-0.8 0.8-2.4 0.8-4 0.8-2.4-0.8-1.6-0.8-2.4-0.8c-36.8-12-68-30.4-92-54.4-28-27.2-48-60.8-62.4-98.4-4.8-12-18.4-18.4-29.6-13.6-12 4.8-17.6 17.6-13.6 30.4 16.8 44 40.8 83.2 73.6 115.2 29.6 29.6 66.4 52 111.2 66.4h0.8l6.4 2.4 1.6 0.8c0.8 0.8 1.6 0.8 3.2 1.6v369.6c-116.8 0-218.4 20-266.4 48 1.6-19.2 5.6-40 12.8-70.4 12-48 28-88 47.2-121.6l0.8-1.6c47.2-81.6 98.4-124.8 167.2-146.4l2.4-1.6h0.8c1.6-0.8 2.4-1.6 4-2.4l0.8-0.8 1.6-0.8v-0.8l1.6-1.6v-0.8c0.8-0.8 1.6-2.4 2.4-4V528c0.8-1.6 1.6-4 1.6-5.6v-8c0-1.6-0.8-4-1.6-5.6v-0.8c-0.8-1.6-1.6-3.2-2.4-4v-0.8l-1.6-1.6-1.6-1.6-2.4 0.8c-1.6-0.8-2.4-1.6-4-2.4h-0.8l-2.4-0.8c-68-20.8-120-64.8-167.2-147.2l-0.8-0.8c-36.8-64.8-61.6-152.8-66.4-271.2h-47.2c4.8 128 32 223.2 72.8 294.4l0.8 1.6C297.6 445.6 352 491.2 409.6 520c-57.6 28-111.2 74.4-152.8 145.6l-0.8 1.6c-38.4 67.2-65.6 156.8-71.2 276h652.8c-5.6-120-32-209.6-71.2-276.8z" /></svg>
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

          {/* MICRO */}
          <button
            type="button"
            className="chat-input-mic-btn"
            onClick={isRecording ? stopAudioRecording : startAudioRecording}
            title={
              isRecording
                ? "Arrêter l'enregistrement"
                : "Envoyer un message audio"
            }
          >
            {isRecording ? "⏹️" : <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#e0c084" className="bi bi-mic" viewBox="0 0 16 16">
              <path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5"/>
              <path d="M10 8a2 2 0 1 1-4 0V3a2 2 0 1 1 4 0zM8 0a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V3a3 3 0 0 0-3-3"/>
            </svg>}
          </button>

          {/* EMOJI */}
          <button
            type="button"
            className="chat-input-emoji-btn"
            onClick={() => setShowEmojiPicker((v) => !v)}
            title="Insérer un emoji"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#e0c084" className="bi bi-emoji-smile" viewBox="0 0 16 16">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
              <path d="M4.285 9.567a.5.5 0 0 1 .683.183A3.5 3.5 0 0 0 8 11.5a3.5 3.5 0 0 0 3.032-1.75.5.5 0 1 1 .866.5A4.5 4.5 0 0 1 8 12.5a4.5 4.5 0 0 1-3.898-2.25.5.5 0 0 1 .183-.683M7 6.5C7 7.328 6.552 8 6 8s-1-.672-1-1.5S5.448 5 6 5s1 .672 1 1.5m4 0c0 .828-.448 1.5-1 1.5s-1-.672-1-1.5S9.448 5 10 5s1 .672 1 1.5"/>
            </svg>
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
