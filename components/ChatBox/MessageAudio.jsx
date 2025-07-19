"use client";
import { useRef, useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";
console.log("MessageAudio MONTÉ !");

// Convertit "1:23" en secondes (83)
function dureeStringToSec(str) {
  if (!str) return 0;
  const parts = str.split(":");
  if (parts.length !== 2) return 0;
  const min = parseInt(parts[0], 10) || 0;
  const sec = parseInt(parts[1], 10) || 0;
  return min * 60 + sec;
}
function formatAffichageDuree(secs) {
  if (typeof secs === "string" && /^\d+:\d{2}$/.test(secs)) return secs;
  if (typeof secs !== "number" || isNaN(secs)) return "0:00";
  const min = Math.floor(secs / 60);
  const sec = Math.floor(secs % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
}

export default function MessageAudio({ url, duration }) {
   console.log("[AUDIO] duration prop:", duration, typeof duration, url);
   console.log("MessageAudio rendu", { url, duration });

  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(0);
  const [audioLoaded, setAudioLoaded] = useState(false);
useEffect(() => {
  const audio = audioRef.current;
  if (!audio) return;
  function handleNativePlay() {
    console.log("NATIVE AUDIO PLAY");
    setIsPlaying(true);
  }
  function handleNativePause() {
    console.log("NATIVE AUDIO PAUSE");
    setIsPlaying(false);
  }
  audio.addEventListener("play", handleNativePlay);
  audio.addEventListener("pause", handleNativePause);
  return () => {
    audio.removeEventListener("play", handleNativePlay);
    audio.removeEventListener("pause", handleNativePause);
  };
}, []);
  // Dès qu'on a la durée du player
  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (audio && audio.duration && !isNaN(audio.duration)) {
      setTotal(audio.duration);
      setAudioLoaded(true);
    }
  };

  // Play/Pause toggle
  const handleToggle = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
  };

  // Mets à jour isPlaying
  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrent(0);
  };

  // Mets à jour la barre à chaque tick
  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrent(audio.currentTime);
    setTotal(audio.duration || 0);
    setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
  };

  // Clique sur la barre de progression
  const handleSeek = (e) => {
    const rect = e.target.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = clickX / rect.width;
    if (audioRef.current && total) {
      audioRef.current.currentTime = percent * total;
    }
  };

  // Fallback total (si metadata pas dispo)
  let totalAffiche = total > 0
    ? total
    : dureeStringToSec(duration);

  return (
    <div className="audio-bubble" style={{ display: "flex", alignItems: "center", gap: 8 }}>
<button
  className="playpause-button"
  onClick={() => {
    console.log("BTN CLICK");
    handleToggle();
  }}
  aria-label={isPlaying ? "Pause" : "Play"}
  style={{ border: "none", background: "none", cursor: "pointer" }}
>
  TEST
  {isPlaying ? <Pause /> : <Play />}
</button>


      <div
        className="audio-progress"
        style={{
          flex: 1,
          height: 8,
          borderRadius: 4,
          background: "#eee",
          margin: "0 8px",
          cursor: "pointer",
          position: "relative",
          minWidth: 60,
        }}
        onClick={handleSeek}
      >
        <div
          className="audio-progress-bar"
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "#e0c084",
            borderRadius: 4,
            transition: "width 0.1s linear",
          }}
        />
      </div>
      <span className="duration" style={{ fontVariantNumeric: "tabular-nums", fontSize: 13, minWidth: 55, textAlign: "right" }}>
        {formatAffichageDuree(current)} / {
          // Si la durée réelle du player est connue, on affiche en priorité, sinon la valeur prop
          formatAffichageDuree(totalAffiche)
        }
      </span>
     <audio
  ref={audioRef}
  src={url}
  onLoadedMetadata={handleLoadedMetadata}
  onEnded={handleEnded}
  onPause={() => {
    console.log("AUDIO PAUSE");
    setIsPlaying(false);
  }}
  onPlay={() => {
    console.log("AUDIO PLAY");
    setIsPlaying(true);
  }}
  onTimeUpdate={handleTimeUpdate}
  preload="auto"
/>

    </div>
  );
}
