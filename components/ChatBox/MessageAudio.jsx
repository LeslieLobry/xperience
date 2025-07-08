import { useRef } from "react";
import { Play } from "lucide-react";

// Fonction pour nettoyer la durée
function formatAffichageDuree(duree) {
  if (!duree || !/^\d+:\d{2}$/.test(duree)) return "0:00";
  return duree;
}

export default function MessageAudio({ url, duration }) {
  const audioRef = useRef(null);

  return (
    <div className="audio-bubble">
      <button
        className="play-button"
        onClick={() => audioRef.current?.play()}
      >
        <Play />
      </button>
      <audio ref={audioRef} src={url} />
      <span className="duration">{formatAffichageDuree(duration)}</span>
    </div>
  );
}
