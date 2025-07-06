"use client";

import { useRef, useState, useEffect } from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pr1, setPr1] = useState("");    // Pour prénom 1
  const [pr2, setPr2] = useState("");    // Pour prénom 2
  const [loadingPrenoms, setLoadingPrenoms] = useState(false);
  const [prenomsOK, setPrenomsOK] = useState(false); // Passera à true après POST ou si déjà existant
  const [membreParlant, setMembreParlant] = useState("couple");
  const textareaRef = useRef(null);

  // → Fetch prénoms si utilisateur couple
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

  // → Submit prénoms pour le couple dans la conversation
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

  // → Gère la saisie dans le chat + typing
  const handleTyping = (e) => {
    const value = e.target.value;
    setTexte(value);
    if (onTyping) onTyping(); // <- Appelle bien la notif typing à chaque frappe
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  // → Submit message
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!texte.trim()) return;

    // Si couple, envoie info sur qui parle (et les prénoms pour le front)
    if (utilisateur.type === "couple") {
      await onMessageSent(texte, "TEXTE", membreParlant, pr1, pr2);
    } else {
      await onMessageSent(texte, "TEXTE");
    }
    setTexte("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  return (
    <>
      {utilisateur.type === "couple" && !prenomsOK ? (
        // → Inputs pour entrer les prénoms (une seule fois)
        <form className="chat-input" onSubmit={handlePrenomsSubmit} style={{ flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              type="text"
              placeholder="Prénom membre 1"
              value={pr1}
              onChange={e => setPr1(e.target.value)}
              style={{ width: 120 }}
              disabled={loadingPrenoms}
              autoFocus
            />
            <input
              type="text"
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
      ) : (
        // → Champ classique + select qui parle
        <form className="chat-input" onSubmit={handleSubmit}>
          <div className="input-wrapper" style={{ alignItems: "center" }}>
            {utilisateur.type === "couple" && (
              <select
                className="select-membre"
                value={membreParlant}
                onChange={e => setMembreParlant(e.target.value)}
                style={{ marginRight: 8 }}
              >
                <option value="MEMBRE_1">{pr1}</option>
                <option value="MEMBRE_2">{pr2}</option>
                <option value="couple">Le couple</option>
              </select>
            )}

            <textarea
              ref={textareaRef}
              className="input-text"
              value={texte}
              placeholder="Écris un message…"
              onChange={handleTyping}
              rows={1}
              style={{ resize: "none" }}
            />

            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              className={`audio-btn ${recording ? "recording" : ""}`}
            >
              {recording ? "🟥" : "🎙️"}
            </button>

            <button
              type="button"
              className="emoji-btn"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              😊
            </button>
          </div>

          <button type="submit" className="message-btn">
            Envoyer
          </button>
        </form>
      )}

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
