import { useRef, useState } from "react";
import { Play } from "lucide-react";

export default function MessageAudio({ url, duration }) {
  const audioRef = useRef(null);
  const [localDuration, setLocalDuration] = useState(null);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? "0" + sec : sec}`;
  };

  return (
    <div className="audio-bubble">
      <button
        className="play-button"
        onClick={() => audioRef.current?.play()}
      >
        <Play />
      </button>
      <audio
        ref={audioRef}
        src={url}
        onLoadedMetadata={() => {
          if (!duration && audioRef.current?.duration) {
            setLocalDuration(formatTime(audioRef.current.duration));
          }
        }}
      />
      <span className="duration">
        {duration || localDuration || "..."}
      </span>
    </div>
  );
}
