"use client";

import { useEffect, useRef, useState } from "react";
import { Realtime } from "ably";
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import "./ChatBox.css";
import { Room, createLocalTracks } from "livekit-client";

const ably = new Realtime(process.env.NEXT_PUBLIC_ABLY_API_KEY);

export default function ChatBox({ conversationId, utilisateur }) {
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [interlocuteur, setInterlocuteur] = useState(null);
  const [room, setRoom] = useState(null);
  const [inCall, setInCall] = useState(false);
  const [waitingAnswer, setWaitingAnswer] = useState(false);

  const messagesEndRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const textareaRef = useRef(null);

  const adjustTextareaHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  const handleChange = (e) => {
    setTexte(e.target.value);
    adjustTextareaHeight();
  };

  useEffect(() => {
    if (!conversationId) return;

    const channel = ably.channels.get(`conversation-${conversationId}`);

    channel.subscribe("message", (msg) => {
      setMessages((prev) => [...prev, msg.data]);
      scrollToBottom();
    });

    fetch(`/api/conversations/${conversationId}`)
      .then((res) => res.json())
      .then((data) => {
        setInterlocuteur(data.interlocuteur);
      });

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId]);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const envoyerMessage = async () => {
    if (!texte.trim() && !imageFile) return;

    const messageData = {
      auteurId: utilisateur.id,
      pseudo: utilisateur.pseudo,
      texte,
      type: imageFile ? "IMAGE" : "TEXTE",
      date: new Date().toISOString(),
      conversationId,
    };

    if (imageFile) {
      const formData = new FormData();
      formData.append("conversationId", conversationId);
      formData.append("contenu", texte);
      formData.append("type", "IMAGE");
      formData.append("image", imageFile);

      const res = await fetch("/api/messages", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      messageData.imageUrl = data.message.imageUrl;
    }

    const channel = ably.channels.get(`conversation-${conversationId}`);
    channel.publish("message", messageData);
    setMessages((prev) => [...prev, messageData]);
    setTexte("");
    setImageFile(null);
  };


const startCall = async (video = false) => {
  try {
    console.log("🔄 Démarrage de l'appel...", { video });

    const res = await fetch("/api/livekit-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: utilisateur.pseudo, room: String(conversationId) }),
    });

    const { token } = await res.json();

    if (!token) {
      console.error("❌ Token manquant !");
      return;
    }

    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!livekitUrl || !livekitUrl.startsWith("wss://")) {
      console.error("❌ LIVEKIT_URL invalide :", livekitUrl);
      return;
    }

    console.log("✅ Token reçu. Connexion à LiveKit avec URL :", livekitUrl);

    const tracks = await createLocalTracks({
      audio: true,
      video: video, // false si appel audio seulement
    });

    console.log("🎥 Tracks créés :", tracks);

    const newRoom = new Room();
    await newRoom.connect(livekitUrl, token, {
      tracks, // ✅ Très important : on passe les tracks ici
    });

    console.log("✅ Connexion LiveKit réussie !");

    // Active le micro et la caméra s'ils ne le sont pas déjà
    await newRoom.localParticipant.setMicrophoneEnabled(true);
    if (video) {
      await newRoom.localParticipant.setCameraEnabled(true);
    }

    newRoom.on("trackSubscribed", (track, publication, participant) => {
      console.log("📹 Track distant abonné :", track.kind);
      if (track.kind === "video") {
        track.attach(remoteVideoRef.current);
      }
    });

    // ✅ Attache le flux local à la caméra locale
    setTimeout(() => {
  const videoTracksMap = newRoom?.localParticipant?.videoTracks;
if (videoTracksMap && videoTracksMap.size > 0) {
  const trackPublication = [...videoTracksMap.values()][0];
  if (trackPublication?.track) {
    trackPublication.track.attach(localVideoRef.current);
  }
}
    const trackPublication = [...videoTracksMap.values()][0];

      if (trackPublication?.track) {
        console.log("📷 Attachement du flux local !");
        trackPublication.track.attach(localVideoRef.current);
      } else {
        console.warn("⚠️ Track publication sans track.");
      }
    }, 1000);

    setRoom(newRoom);
    setInCall(true);
  } catch (err) {
    console.error("❌ Erreur lors de la connexion à LiveKit :", err);
  }
};
  const hangupCall = () => {
    room?.disconnect();
    setRoom(null);
    setInCall(false);
  };

  return (
    <div className="chatbox-container">
      <ChatHeader
        nom={interlocuteur?.pseudo}
        onCallAudio={() => startCall(false)}
        onCallVideo={() => startCall(true)}
        onClose={hangupCall}
      />

      {inCall && (
        <>
          <video ref={localVideoRef} autoPlay muted playsInline className="mini-webcam" />
          <video ref={remoteVideoRef} autoPlay playsInline className="mini-webcam remote" />
          <button className="hangup-button" onClick={hangupCall}>Raccrocher</button>
        </>
      )}

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} utilisateur={utilisateur} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          envoyerMessage();
        }}
      >
        <textarea
          ref={textareaRef}
          className="input-text"
          placeholder="Écrire un message..."
          value={texte}
          onChange={handleChange}
          rows={1}
          style={{ overflow: "hidden", resize: "none" }}
        />
        <label htmlFor="image-upload" className="upload-label">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" stroke="#e0c084">
            <path d="M21.44 11.05L12 20.5a5.002 5.002 0 01-7.07-7.07l9.9-9.9a3 3 0 114.24 4.24L8.47 17.5" />
          </svg>
        </label>
        <input
          id="image-upload"
          type="file"
          accept="image/*"
          className="message-image"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files[0];
            if (file) setImageFile(file);
          }}
        />
        {imageFile && (
          <div className="image-preview">
            <p style={{ fontSize: "0.8rem", color: "#ccc" }}>📎 {imageFile.name}</p>
            <img
              src={URL.createObjectURL(imageFile)}
              alt="Aperçu"
              style={{ maxWidth: "120px", maxHeight: "120px", borderRadius: "8px", marginTop: "4px" }}
            />
          </div>
        )}
        <button type="submit" className="message-btn">Envoyer</button>
      </form>
    </div>
  );
}
