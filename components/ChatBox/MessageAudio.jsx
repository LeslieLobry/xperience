import { useRef } from "react";
import { Play } from "lucide-react";

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
      <span className="duration">{duration}</span>
    </div>
  );
}
