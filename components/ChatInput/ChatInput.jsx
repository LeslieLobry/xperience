import { useRef, useState, useEffect } from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import "./ChatInput.css";
import { CircleStop } from "lucide-react";

// ===== UTILS =====
function generateOptimisticKey() {
  return "tmp-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
}

// Fonction utilitaire pour choisir le meilleur mime-type audio
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
  // ✅ Anti double envoi ultra court (sans bloquer l’UI)
  const sendLockRef = useRef(false);
  const lockSend = () => {
    sendLockRef.current = true;
    setTimeout(() => {
      sendLockRef.current = false;
    }, 250);
  };

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
          let d = audio.duration;
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
    return duree;
  }

  // COUPLE
  const [pr1, setPr1] = useState("");
  const [pr2, setPr2] = useState("");
  const [loadingPrenoms, setLoadingPrenoms] = useState(false);
  const [prenomsOK, setPrenomsOK] = useState(false);
  const [membreParlant, setMembreParlant] = useState("couple");

  // EMOJI
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

  // ✅ ref input file (sablier cliquable)
  const fileInputRef = useRef(null);

  // ✅ comportement clair des boutons
  const openPickerNormal = () => {
    if (isSending) return;
    if (!imageFile) {
      setEphemere(false);
      fileInputRef.current?.click();
    } else {
      setEphemere(false);
    }
  };

  const openPickerEphemere = () => {
    if (isSending) return;
    if (!imageFile) {
      setEphemere(true);
      fileInputRef.current?.click();
    } else {
      setEphemere(true);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setShowCamera(true);
      if (videoRef.current) videoRef.current.srcObject = stream;
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 50);
    } catch (err) {
      console.error("Erreur caméra :", err);
      alert("Impossible d'accéder à la caméra.");
    }
  };

  const stopCamera = () => {
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    } catch (_) {}
    setCameraStream(null);
    setShowCamera(false);
  };

  const handleTakePhoto = async () => {
    try {
      const video = videoRef.current;
      if (!video) return;

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
      if (!blob) return;

      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });

      let compressed = file;
      try {
        compressed = await compressImage(file, 900);
      } catch (err) {
        compressed = file;
      }

      const url = URL.createObjectURL(compressed);
      setImagePreview(url);
      setImageFile(compressed);

      stopCamera();
    } catch (err) {
      console.error("Erreur capture photo :", err);
      alert("Erreur lors de la capture.");
    }
  };

  const handlePickImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
  // ✅ N'affiche le formulaire que si aucun prénom n'existe nulle part.
  // 1) si l'utilisateur a déjà prenom1/prenom2 => OK direct
  // 2) sinon on tente /api/prenoms-couple
  useEffect(() => {
    if (utilisateur.type !== "couple") return;

    const userP1 = (utilisateur?.prenom1 || "").trim();
    const userP2 = (utilisateur?.prenom2 || "").trim();
    const hasUserPrenoms = Boolean(userP1) && Boolean(userP2);

    if (hasUserPrenoms) {
      setPr1(userP1);
      setPr2(userP2);
      setPrenomsOK(true);
      // garde un membre parlant cohérent
      setMembreParlant((prev) => prev || "couple");
      setLoadingPrenoms(false);
      return;
    }

    setLoadingPrenoms(true);

    fetch(`/api/prenoms-couple?conversationId=${conversationId}`)
      .then((res) => res.json())
      .then((data) => {
        const p1 = (data?.prenoms?.prenom1 || "").trim();
        const p2 = (data?.prenoms?.prenom2 || "").trim();

        if (p1 && p2) {
          setPr1(p1);
          setPr2(p2);
          setPrenomsOK(true);

          // si l'utilisateur avait encore "couple", on laisse.
          // sinon, on s'assure que la valeur est bien dans les options.
          setMembreParlant((prev) => {
            if (!prev) return "couple";
            if (prev === p1 || prev === p2 || prev === "couple") return prev;
            return "couple";
          });
        } else {
          setPrenomsOK(false);
        }
      })
      .catch(() => {
        setPrenomsOK(false);
      })
      .finally(() => setLoadingPrenoms(false));
  }, [conversationId, utilisateur.type, utilisateur?.prenom1, utilisateur?.prenom2]);

  const handlePrenomsSubmit = async (e) => {
    e.preventDefault();

    const p1 = (pr1 || "").trim();
    const p2 = (pr2 || "").trim();
    if (!p1 || !p2) return;

    setLoadingPrenoms(true);

    try {
      const res = await fetch("/api/prenoms-couple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          prenom1: p1,
          prenom2: p2,
        }),
      });

      const dataRes = await res.json().catch(() => null);

      if (res.ok && dataRes?.success) {
        // ✅ met à jour immédiatement (pas de flash)
        setPr1(p1);
        setPr2(p2);
        setPrenomsOK(true);
        setMembreParlant((prev) => (prev ? prev : "couple"));
      }
    } finally {
      setLoadingPrenoms(false);
    }
  };

  // ✅ AUTO-GROW (Messenger-like)
  const MAX_TA_HEIGHT = 140; // ~5-6 lignes

  function autoResize() {
    const ta = textareaRef.current;
    if (!ta) return;

    // reset height to recompute scrollHeight
    ta.style.height = "auto";

    const next = Math.min(ta.scrollHeight, MAX_TA_HEIGHT);
    ta.style.height = next + "px";

    // ✅ après le max => textarea scrollable
    if (ta.scrollHeight > MAX_TA_HEIGHT) {
      ta.style.overflowY = "auto";
    } else {
      ta.style.overflowY = "hidden";
    }
  }

  useEffect(() => {
    autoResize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texte]);

  // --- SUBMIT LOGIC (✅ reset UI immédiat, plus de “Envoi…” qui traîne) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sendLockRef.current) return;
    lockSend();

    // on active 1 instant (mais on coupe vite)
    setIsSending(true);

    try {
      // IMAGE
      if (imageFile) {
        const optimisticKey = generateOptimisticKey();
        const texteToSend = texte || "";
        const isEph = ephemere;

        // ✅ RESET UI IMMÉDIAT
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setImageFile(null);
        setImagePreview(null);
        setTexte("");
        setEphemere(false);

        // ✅ Envoi via parent (optimistic)
        if (utilisateur.type === "couple") {
          const p = onMessageSent(
            {
              file: imageFile,
              contenu: texteToSend,
              type: "IMAGE",
              conversationId,
              ephemere: isEph,
              membreParlant,
              prenom1: pr1,
              prenom2: pr2,
              optimisticKey,
            },
            "IMAGE",
            membreParlant,
            true,
            optimisticKey
          );
          if (p?.catch) p.catch((err) => console.error("[ChatInput] Erreur envoi IMAGE:", err));
        } else {
          const p = onMessageSent(
            {
              file: imageFile,
              contenu: texteToSend,
              type: "IMAGE",
              conversationId,
              ephemere: isEph,
              optimisticKey,
            },
            "IMAGE",
            undefined,
            true,
            optimisticKey
          );
          if (p?.catch) p.catch((err) => console.error("[ChatInput] Erreur envoi IMAGE:", err));
        }

        setIsSending(false);
        return;
      }

      // AUDIO
      if (audioBlob) {
        const optimisticKey = generateOptimisticKey();

        // ✅ RESET UI IMMÉDIAT
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioBlob(null);
        setAudioUrl(null);

        // ✅ duration
        const duree = await getAccurateDuration(audioBlob);

        const formData = new FormData();
        formData.append("audio", audioBlob, `audio-${Date.now()}.webm`);
        formData.append("conversationId", String(conversationId));
        formData.append("type", "AUDIO");
        formData.append("duree", String(duree));
        formData.append("optimisticKey", optimisticKey);

        if (utilisateur.type === "couple") {
          formData.append("membreParlant", membreParlant);
          formData.append("prenom1", pr1);
          formData.append("prenom2", pr2);
        }

        const p = onMessageSent(formData, "AUDIO", membreParlant, false, optimisticKey);
        if (p?.catch) p.catch((err) => console.error("[ChatInput] Erreur envoi AUDIO:", err));

        setIsSending(false);
        return;
      }

      // TEXTE
      const texteToSend = (texte || "").trim();
      if (!texteToSend) {
        setIsSending(false);
        return;
      }

      const optimisticKey = generateOptimisticKey();
      const isEph = ephemere;

      // ✅ RESET UI IMMÉDIAT
      setTexte("");
      setEphemere(false);

      if (utilisateur.type === "couple") {
        const p = onMessageSent(
          {
            contenu: texteToSend,
            type: isEph ? "EPHEMERE" : "TEXTE",
            conversationId,
            optimisticKey,
            membreParlant,
            prenom1: pr1,
            prenom2: pr2,
          },
          "TEXTE",
          membreParlant,
          false,
          optimisticKey
        );
        if (p?.catch) p.catch((err) => console.error("[ChatInput] Erreur envoi TEXTE:", err));
      } else {
        const p = onMessageSent(
          {
            contenu: texteToSend,
            type: isEph ? "EPHEMERE" : "TEXTE",
            conversationId,
            optimisticKey,
          },
          "TEXTE",
          undefined,
          false,
          optimisticKey
        );
        if (p?.catch) p.catch((err) => console.error("[ChatInput] Erreur envoi TEXTE:", err));
      }
      return;
    } catch (err) {
      console.error("[ChatInput] Erreur lors de l'envoi du message :", err);
      setIsSending(false);
    }
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
    e.preventDefault();
    if (sendLockRef.current) return;
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
            <button onClick={handleTakePhoto} style={{ fontSize: 22, marginRight: 24 }}>
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
          onChange={(e) => {
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
          }}
        />

        <div className="input-wrapper" style={{ alignItems: "center" }}>
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
              >
                ✕
              </button>
            </div>
          )}

          {/* Input file caché */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handlePickImage}
            style={{ display: "none" }}
          />

          {/* Boutons */}
          <button type="button" onClick={openPickerNormal} disabled={isSending}>
            📷
          </button>
          <button type="button" onClick={openPickerEphemere} disabled={isSending}>
            ⏳
          </button>
          <button type="button" onClick={startCamera} disabled={isSending}>
            📸
          </button>

          {/* Emoji */}
          <button type="button" onClick={() => setShowEmojiPicker((v) => !v)} disabled={isSending}>
            😀
          </button>

          {/* Audio */}
          {!isRecording ? (
            <button
              type="button"
              className="chat-input-mic-btn"
              disabled={isSending}
              onClick={async () => {
                try {
                  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                  const chosenType = getSupportedAudioType();
                  setAudioType(chosenType);

                  const recorder = new MediaRecorder(stream, { mimeType: chosenType });
                  audioChunks.current = [];

                  recorder.ondataavailable = (event) => {
                    if (event.data.size > 0) audioChunks.current.push(event.data);
                  };

                  recorder.onstop = async () => {
                    const blob = new Blob(audioChunks.current, { type: chosenType });
                    const url = URL.createObjectURL(blob);
                    setAudioBlob(blob);
                    setAudioUrl(url);

                    // stop tracks
                    try {
                      stream.getTracks().forEach((t) => t.stop());
                    } catch (_) {}

                    audioStopRef.current = Date.now();
                  };

                  audioStartRef.current = Date.now();
                  recorder.start();
                  setMediaRecorder(recorder);
                  setIsRecording(true);
                } catch (err) {
                  console.error("Erreur micro :", err);
                  alert("Impossible d'accéder au micro.");
                }
              }}
            >
              🎤
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                try {
                  mediaRecorder?.stop();
                } catch (_) {}
                setIsRecording(false);
              }}
              className="chat-input-mic-btn"
            >
              <CircleStop size={20} />
            </button>
          )}

          {/* Envoyer */}
          <button type="submit" disabled={isSending}>
            ➤
          </button>
        </div>
      </form>

      {/* Picker emoji */}
      {showEmojiPicker && (
        <div style={{ position: "absolute", bottom: 60, right: 10, zIndex: 999 }}>
          <Picker
            data={data}
            onEmojiSelect={(emoji) => {
              setTexte((prev) => prev + emoji.native);
              setShowEmojiPicker(false);
            }}
          />
        </div>
      )}
    </>
  );
}
