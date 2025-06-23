"use client";

import { useRef, useState } from "react";
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
  const textareaRef = useRef(null);

  const handleTyping = (e) => {
    const value = e.target.value;
    setTexte(value);
    onTyping();

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  const envoyerMessage = async () => {
    if (!texte.trim()) return;
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, contenu: texte, type: "TEXTE" }),
    });
    const data = await res.json();
    if (data.success) {
      onMessageSent(data.message);
      setTexte("");
    }
  };

  return (
    <>
      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          envoyerMessage();
        }}
      >
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            className="input-text"
            value={texte}
            placeholder="Écris un message..."
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
