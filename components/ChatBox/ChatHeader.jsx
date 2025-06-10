import { Phone, Video, X } from "lucide-react";
import "./ChatBox.css";

export default function ChatHeader({ nom, onCallAudio, onCallVideo, onClose }) {
  return (
    <div className="chat-header">
      <h2 className="chat-title">{nom}</h2>
      <div className="chat-actions">
        <button onClick={onCallAudio}><Phone /></button>
        <button onClick={onCallVideo}><Video /></button>
        <button onClick={onClose}><X /></button>
      </div>
    </div>
  );
}
