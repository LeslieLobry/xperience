import { useRef, useState, useEffect } from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import "./ChatInput.css";
import { CircleStop } from "lucide-react";

// ===== UTILS =====
function generateOptimisticKey() {
  return "tmp-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
}

function getSupportedAudioType() {
  if (typeof window === "undefined" || !window.MediaRecorder) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  if (MediaRecorder.isTypeSupported("audio/mpeg")) return "audio/mpeg";
  return "audio/webm";
}

export default function ChatInput({
  utilisateur,
  conversationId,
  texte,
  setTexte,
  onMessageSent,
  onTyping,
}) {
  // AUDIO
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioType, setAudioType] = useState(getSupportedAudioType());
  const audioStartRef = useRef(null);
  const audioStopRef = useRef(null);
  const audioChunks = useRef([]);
  const textareaRef = useRef();

  const [isSending, setIsSending] = useState(false);

  // ✅ NEW: garde le fichier/preview pendant qu’on cache l’UI
  const pendingImageRef = useRef(null); // { file, previewUrl, ephemere }
  const pendingAudioRef = useRef(null); // { blob, url, ephemere }

  function formatDuration(secs) {
    if (!secs || isNaN(secs) || !isFinite(secs) || secs < 0) return "0:01";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" + s : s}`;
  }

  async function getAccurateDuration(blob) {
    let chrono = 0;
    if (audioStartRef.current && audioStopRef.current) {
      chrono = Math.round((audioStopRef.current - audioStartRef.current) / 1000);
    }
    let html5 = null;
    try {
      html5 = await new Promise((resolve) => {
        const audio = document.createElement("audio");
        audio.preload = "metadata";
        audio.src = URL.createObjectURL(blob);
        audio.onloadedmetadata = function () {
          const d = audio.duration;
          URL.revokeObjectURL(audio.src);
          if (d && isFinite(d) && d > 0) resolve(Math.round(d));
          else resolve(null);
        };
        audio.onerror = function () {
          resolve(null);
        };
      });
    } catch (err) {}

    let duree = Math.max(chrono || 0, html5 || 0);
    if (!duree || isNaN(duree) || duree < 1) duree = 1;
    return formatDuration(duree);
  }

  // COUPLE
  const [pr1, setPr1] = useState("");
  const [pr2, setPr2] = useState("");
  const [loadingPrenoms, setLoadingPrenoms] = useState(false);
  const [prenomsOK, setPrenomsOK] = useState(false);
  const [membreParlant, setMembreParlant] = useState("couple");

  // EMOJI
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // --- IMAGE COMPRESSION ---
  const compressImage = (file, maxSize = 900) =>
    new Promise((resolve) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      img.onload = function () {
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
        const width = Math.round(img.width * ratio);
        const height = Math.round(img.height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            resolve(
              new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
                type: "image/jpeg",
              })
            );
            URL.revokeObjectURL(url);
          },
          "image/jpeg",
          0.7
        );
      };
      img.src = url;
    });

  // IMAGE/CAMERA
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [ephemere, setEphemere] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);

  const fileInputRef = useRef(null);

  // --- AUDIO RECORDING ---
  const startAudioRecording = async () => {
    try {
      const supportedType = getSupportedAudioType();
      setAudioType(supportedType);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new window.MediaRecorder(
        stream,
        supportedType ? { mimeType: supportedType } : undefined
      );
      audioChunks.current = [];
      audioStartRef.current = Date.now();
      audioStopRef.current = null;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      recorder.onstop = () => {
        audioStopRef.current = Date.now();
        if (audioChunks.current.length) {
          const blob = new Blob(audioChunks.current, {
            type: supportedType || "audio/webm",
          });
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
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    audioStartRef.current = null;
    audioStopRef.current = null;
  };

  // --- CAMERA ---
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCamera, cameraStream]);

  const handleTakePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 360;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          if (imagePreview) URL.revokeObjectURL(imagePreview);
          setImagePreview(URL.createObjectURL(blob));
          setImageFile(new File([blob], "photo.jpg", { type: "image/jpeg" }));
          stopCamera();
        }
      },
      "image/jpeg",
      0.9
    );
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);

    let compressed = file;
    try {
      compressed = await compressImage(file, 900);
    } catch (err) {
      compressed = file;
    }
    const url = URL.createObjectURL(compressed);
    setImagePreview(url);
    setImageFile(compressed);
    e.target.value = "";
  };

  const removePreview = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setImageFile(null);
  };

  // --- PRENOMS COUPLE ---
  useEffect(() => {
    if (utilisateur.type !== "couple") return;
    setLoadingPrenoms(true);
    fetch(`/api/prenoms-couple?conversationId=${conversationId}`)
      .then((res) => res.json())
      .then((data) => {
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

  const handlePrenomsSubmit = async (e) => {
    e.preventDefault();
    if (!pr1.trim() || !pr2.trim()) return;
    setLoadingPrenoms(true);
    const res = await fetch("/api/prenoms-couple", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, prenom1: pr1, prenom2: pr2 }),
    });
    const dataRes = await res.json();
    if (dataRes.success) setPrenomsOK(true);
    setLoadingPrenoms(false);
  };

  const MAX_HEIGHT = 140;
  function autoResize() {
    const ta = textareaRef.current;
    if (!ta) return;
    const prev = ta.style.height;
    ta.style.height = "auto";
    const next = Math.min(ta.scrollHeight, MAX_HEIGHT);
    const nextPx = next + "px";
    if (prev !== nextPx) ta.style.height = nextPx;
    else ta.style.height = prev;
    ta.style.overflowY = "hidden";
  }

  useEffect(() => {
    autoResize();
  }, [texte]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSending) return;

    const texteToSend = texte || "";
    const texteTrim = texteToSend.trim();
    const ephemereToSend = ephemere;

    if (!imageFile && !audioBlob && !texteTrim) return;

    // ✅ vide l’input direct (déjà OK)
    if (texteToSend.length) {
      setTexte("");
      requestAnimationFrame(autoResize);
    }

    // ✅ CACHE LA MINIATURE DIRECT (UI), mais garde le fichier en ref
    if (imageFile && imagePreview) {
      pendingImageRef.current = { file: imageFile, previewUrl: imagePreview, ephemere: ephemereToSend };
      setImageFile(null);
      setImagePreview(null);
      // ⚠️ ne revoke PAS maintenant, on garde l’URL si rollback
    }

    if (audioBlob && audioUrl) {
      pendingAudioRef.current = { blob: audioBlob, url: audioUrl, ephemere: ephemereToSend };
      // on peut cacher "message audio prêt" aussi si tu veux :
      // setAudioBlob(null); setAudioUrl(null);
      // mais là tu n’as pas demandé, donc je touche pas par défaut
    }

    setIsSending(true);

    try {
      // ✅ IMAGE (avec texte)
      if (imageFile || pendingImageRef.current?.file) {
        const optimisticKey = generateOptimisticKey();
        const formData = new FormData();
        const fileToSend = imageFile || pendingImageRef.current.file;
        const realType = ephemereToSend ? "EPHEMERE" : "IMAGE";

        formData.append("image", fileToSend);
        formData.append("conversationId", conversationId);
        formData.append("type", realType);
        formData.append("optimisticKey", optimisticKey);
        if (texteTrim) formData.append("contenu", texteToSend);

        if (utilisateur.type === "couple" && prenomsOK) {
          formData.append("membreParlant", membreParlant);
          formData.append("prenom1", pr1);
          formData.append("prenom2", pr2);
        }

        await onMessageSent(formData, "IMAGE", membreParlant, true, optimisticKey);

        // ✅ succès : on nettoie “pour de vrai” (revoke url)
        if (pendingImageRef.current?.previewUrl) {
          URL.revokeObjectURL(pendingImageRef.current.previewUrl);
        }
        pendingImageRef.current = null;

        setEphemere(false);
        setIsSending(false);
        return;
      }

      // ✅ AUDIO
      if (audioBlob) {
        const optimisticKey = generateOptimisticKey();
        const duree = await getAccurateDuration(audioBlob);

        const formData = new FormData();
        let extension = "webm";
        if (audioType === "audio/mp4") extension = "m4a";
        if (audioType === "audio/mpeg") extension = "mp3";

        const realType = ephemereToSend ? "EPHEMERE" : "AUDIO";
        formData.append("audio", audioBlob, `audio.${extension}`);
        formData.append("audioType", audioType);
        formData.append("conversationId", conversationId);
        formData.append("type", realType);
        formData.append("duree", duree);
        formData.append("optimisticKey", optimisticKey);
        if (texteTrim) formData.append("contenu", texteToSend);

        if (utilisateur.type === "couple" && prenomsOK) {
          formData.append("membreParlant", membreParlant);
          formData.append("prenom1", pr1);
          formData.append("prenom2", pr2);
        }

        await onMessageSent(formData, "AUDIO", membreParlant, false, optimisticKey);

        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioBlob(null);
        setAudioUrl(null);
        audioStartRef.current = null;
        audioStopRef.current = null;

        setEphemere(false);
        setIsSending(false);
        return;
      }

      // ✅ TEXTE ONLY
      if (!texteTrim) {
        setIsSending(false);
        return;
      }

      const optimisticKey = generateOptimisticKey();

      if (utilisateur.type === "couple" && prenomsOK) {
        await onMessageSent(
          {
            contenu: texteToSend,
            type: ephemereToSend ? "EPHEMERE" : "TEXTE",
            conversationId,
            optimisticKey,
            prenomEnvoyeur: membreParlant === "couple" ? "Le couple" : membreParlant,
            prenom1: pr1,
            prenom2: pr2,
          },
          "TEXTE",
          membreParlant,
          false,
          optimisticKey
        );
      } else {
        await onMessageSent(
          {
            contenu: texteToSend,
            type: ephemereToSend ? "EPHEMERE" : "TEXTE",
            conversationId,
            optimisticKey,
          },
          "TEXTE",
          undefined,
          false,
          optimisticKey
        );
      }

      setEphemere(false);
    } catch (err) {
      console.error("[ChatInput] Erreur lors de l'envoi du message :", err);

      // ✅ rollback texte
      if (texteTrim) {
        setTexte(texteToSend);
        requestAnimationFrame(autoResize);
      }

      // ✅ rollback image preview si on l’a cachée
      if (pendingImageRef.current) {
        setImageFile(pendingImageRef.current.file);
        setImagePreview(pendingImageRef.current.previewUrl);
        setEphemere(pendingImageRef.current.ephemere);
        pendingImageRef.current = null;
      }
    }

    setIsSending(false);
  };

  // --- Notification éphémère ---
  const [showEphemereNotif, setShowEphemereNotif] = useState(false);
  useEffect(() => {
    if (showEphemereNotif) {
      const timer = setTimeout(() => setShowEphemereNotif(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showEphemereNotif]);

  const handleSubmitWithNotif = async (e) => {
    e.preventDefault();
    if (isSending) return;
    if (ephemere) setShowEphemereNotif(true);
    await handleSubmit(e);
  };

  return (
    <>
      {utilisateur.type === "couple" && !prenomsOK && (
        <form
          className="chat-input"
          onSubmit={handlePrenomsSubmit}
          style={{ flexDirection: "column", gap: 8 }}
        >
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              type="text"
              className="input-prenom"
              placeholder="Prénom membre 1"
              value={pr1}
              onChange={(e) => setPr1(e.target.value)}
              style={{ width: 120 }}
              disabled={loadingPrenoms}
              autoFocus
            />
            <input
              type="text"
              className="input-prenom"
              placeholder="Prénom membre 2"
              value={pr2}
              onChange={(e) => setPr2(e.target.value)}
              style={{ width: 120 }}
              disabled={loadingPrenoms}
            />
            <button type="submit" disabled={loadingPrenoms || !pr1 || !pr2}>
              Valider
            </button>
          </div>
        </form>
      )}

      {utilisateur.type === "couple" && prenomsOK && (
        <select
          className="select-membre"
          value={membreParlant}
          onChange={(e) => setMembreParlant(e.target.value)}
        >
          <option value={pr1}>{pr1}</option>
          <option value={pr2}>{pr2}</option>
          <option value="couple">Le couple</option>
        </select>
      )}

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
            boxShadow: "0 0 10px rgba(234, 215, 108, 0.7)",
          }}
        >
          Photo éphémère envoyée!
        </div>
      )}

      <form className="chat-input" onSubmit={handleSubmitWithNotif}>
        <textarea
          className="input-text"
          ref={textareaRef}
          value={texte}
          placeholder="Écris un message…"
          rows={1}
          onChange={(e) => {
            setTexte(e.target.value);
            requestAnimationFrame(autoResize);
          }}
          onInput={() => requestAnimationFrame(autoResize)}
          style={{ resize: "none" }}
        />

        <div className="input-wrapper" style={{ alignItems: "center" }}>
          {/* ✅ Aperçu image (maintenant disparaît dès qu’on envoie) */}
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
                disabled={isSending}
              >
                ×
              </button>
            </div>
          )}

          {/* Aperçu audio */}
          {audioBlob && !isRecording && (
            <div
              className="audio-file-ready"
              style={{
                display: "flex",
                alignItems: "center",
                marginLeft: 8,
                background: "transparent",
                borderRadius: 8,
                fontSize: 8,
              }}
            >
              <span>Message audio prêt à envoyer</span>
              <button
                type="button"
                onClick={removeAudioPreview}
                title="Supprimer l'audio"
                style={{
                  color: "#d00",
                  fontSize: 12,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                }}
                disabled={isSending}
              >
                ×
              </button>
            </div>
          )}

          {/* Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            id="file-upload"
            style={{ display: "none" }}
            onChange={handleImageUpload}
            disabled={!!imageFile || isSending}
          />
          <label
            htmlFor="file-upload"
            className="chat-input-photo-btn"
            title="Envoyer une photo"
            style={{
              pointerEvents: !!imageFile || isSending ? "none" : "auto",
              opacity: !!imageFile || isSending ? 0.5 : 1,
            }}
          >
            {/* icône */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-image-up-icon lucide-image-up"
            >
              <path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21" />
              <path d="m14 19.5 3-3 3 3" />
              <path d="M17 22v-5.5" />
              <circle cx="9" cy="9" r="2" />
            </svg>
          </label>

          {/* SABLIER */}
          <button
            type="button"
            className={`chat-input-ephemere-btn${ephemere ? " active" : ""}`}
            onClick={() => {
              if (!imageFile) {
                setEphemere(true);
                fileInputRef.current?.click();
              } else {
                setEphemere((v) => !v);
              }
            }}
            title="Message éphémère (Snap)"
            disabled={isSending}
          >
            {/* icône sablier */}
            <svg
              width="24px"
              height="24px"
              viewBox="0 0 1024 1024"
              fill="#e0c084"
              className="icon"
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M834.4 92H189.6c-13.6 0-24-11.2-24-24 0-13.6 11.2-24 24-24h644.8c13.6 0 24 11.2 24 24 0.8 12.8-10.4 24-24 24zM866.4 992.8H158.4c-14.4 0-26.4-12-26.4-26.4 0-14.4 12-26.4 26.4-26.4h708c14.4 0 26.4 12 26.4 26.4 0 14.4-12 26.4-26.4 26.4z"
                fill=""
              />
              <path d="M766.4 666.4l-0.8-1.6c-40.8-71.2-95.2-117.6-152.8-145.6 57.6-28.8 111.2-74.4 152.8-145.6l0.8-1.6c40.8-70.4 68-166.4 72.8-294.4H184c4.8 128 32 223.2 72.8 294.4l0.8 1.6C297.6 445.6 352 491.2 409.6 520c-57.6 28-112 74.4-152.8 145.6l-0.8 1.6c-38.4 67.2-65.6 156.8-71.2 276h652.8c-5.6-120-32-209.6-71.2-276.8z" />
            </svg>
          </button>

          {/* MICRO */}
          <button
            type="button"
            className="chat-input-mic-btn"
            onClick={isRecording ? stopAudioRecording : startAudioRecording}
            title={isRecording ? "Arrêter l'enregistrement" : "Envoyer un message audio"}
            disabled={isSending}
          >
            {isRecording ? (
              <CircleStop />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="#e0c084"
                className="bi bi-mic"
                viewBox="0 0 16 16"
              >
                <path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5" />
                <path d="M10 8a2 2 0 1 1-4 0V3a2 2 0 1 1 4 0zM8 0a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V3a3 3 0 0 0-3-3" />
              </svg>
            )}
          </button>

          {/* EMOJI */}
          <button
            type="button"
            className="chat-input-emoji-btn"
            onClick={() => setShowEmojiPicker((v) => !v)}
            title="Insérer un emoji"
            disabled={isSending}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="#e0c084"
              className="bi bi-emoji-smile"
              viewBox="0 0 16 16"
            >
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />
              <path d="M4.285 9.567a.5.5 0 0 1 .683.183A3.5 3.5 0 0 0 8 11.5a3.5 3.5 0 0 0 3.032-1.75.5.5 0 1 1 .866.5A4.5 4.5 0 0 1 8 12.5a4.5 4.5 0 0 1-3.898-2.25.5.5 0 0 1 .183-.683M7 6.5C7 7.328 6.552 8 6 8s-1-.672-1-1.5S5.448 5 6 5s1 .672 1 1.5m4 0c0 .828-.448 1.5-1 1.5s-1-.672-1-1.5S9.448 5 10 5s1 .672 1 1.5" />
            </svg>
          </button>
        </div>

        <button
          type="submit"
          className="message-btn"
          disabled={
            isSending ||
            !((audioBlob && !isRecording) || imageFile || (texte && texte.trim()))
          }
        >
          {isSending ? "Envoi…" : imageFile ? "Envoyer l'image" : audioBlob ? "Envoyer l'audio" : "Envoyer"}
        </button>
      </form>

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
