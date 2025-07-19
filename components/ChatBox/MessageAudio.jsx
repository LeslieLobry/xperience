"use client";
import { useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

function formatAffichageDuree(duree) {
  if (!duree) return "0:00";
  if (/^\d+:\d{2}$/.test(duree)) return duree;
  // Si c'est en secondes, convertit (ex: 62 => 1:02)
  const sec = Math.floor(Number(duree));
  const min = Math.floor(sec / 60);
  const reste = (sec % 60).toString().padStart(2, "0");
  return `${min}:${reste}`;
}

export default function MessageAudio({ url, duration }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(0);

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

  return (
    <div className="audio-bubble" style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button
        className="playpause-button"
        onClick={handleToggle}
        aria-label={isPlaying ? "Pause" : "Play"}
        style={{ border: "none", background: "none", cursor: "pointer" }}
      >
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
      <span className="duration" style={{ fontVariantNumeric: "tabular-nums", fontSize: 13, minWidth: 38, textAlign: "right" }}>
        {formatAffichageDuree(current)} / {formatAffichageDuree(duration || total)}
      </span>
      <audio
        ref={audioRef}
        src={url}
        onEnded={handleEnded}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onTimeUpdate={handleTimeUpdate}
        preload="auto"
      />
    </div>
  );
}
