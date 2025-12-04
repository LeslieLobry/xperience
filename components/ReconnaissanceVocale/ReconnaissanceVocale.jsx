import React, { useState, useRef } from "react";
import "./ReconnaissanceVocale.css";

export default function ReconnaissanceVocale({ onResult }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
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
      onResult(result); // Callback avec la phrase complète
      setListening(false);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setListening(false);
  };

  return (
    <button
      type="button"
      onClick={listening ? stopListening : startListening}
      className={`voice-btn ${listening ? "voice-btn--listening" : ""}`}
    >
      {listening ? "🎙️ Parle !" : "🎤 Recherche vocale"}
    </button>
  );
}
