import React, { useState, useRef } from "react";

export default function ReconnaissanceVocale({ onResult }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Reconnaissance vocale non supportée sur ce navigateur.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const result = event.results[0][0].transcript;
      onResult(result); // Callback avec la phrase
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const stopListening = () => {
    recognitionRef.current && recognitionRef.current.stop();
    setListening(false);
  };

  return (
    <button
      onClick={listening ? stopListening : startListening}
      style={{
        background: listening ? "#e0c084" : "#222",
        color: listening ? "#222" : "#e0c084",
        border: "none",
        borderRadius: 6,
        padding:6,
        width:"100%",
        fontSize: 18,
        cursor: "pointer",
        boxShadow: listening ? "0 0 12px #e0c08488" : "none",
        transition: "all 0.2s"
      }}
    >
      {listening ? "🎙️ Parle !" : "🎤 Recherche vocale"}
    </button>
  );
}
