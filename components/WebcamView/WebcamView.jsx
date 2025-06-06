"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import "./WebcamView.css";

export default function WebcamAndMicView() {
  const videoRef = useRef(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const [stream, setStream] = useState(null);
  const pathname = usePathname();

  const stopStream = () => {
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const startStream = async () => {
    setError("");
    try {
      const userStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setStream(userStream);

      if (videoRef.current) {
        videoRef.current.srcObject = userStream;
      }
    } catch (err) {
      console.error("Erreur webcam/micro :", err);
      setError("Webcam ou micro non accessible.");
      setActive(false); // on désactive l'état si l'accès échoue
    }
  };

  // (1) Quand on clique sur Activer/Désactiver
  useEffect(() => {
    if (active) {
      startStream();
    } else {
      stopStream();
    }
  }, [active]);

  // (2) Quand on quitte la page messagerie
  useEffect(() => {
    if (!pathname.startsWith("/messagerie")) {
      stopStream();
      setActive(false);
    }
  }, [pathname]);

  return (
    <div className="webcam-container">
      <div className="webcam-header">
        <span>🎥 Caméra & 🎙️ Micro</span>
        <button onClick={() => setActive((prev) => !prev)} className="webcam-toggle">
          {active ? "Désactiver" : "Activer"}
        </button>
      </div>
      {error && <p className="webcam-error">{error}</p>}
      {active && <video ref={videoRef} autoPlay muted playsInline className="webcam-video" />}
    </div>
  );
}
