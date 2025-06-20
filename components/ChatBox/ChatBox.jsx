"use client";

import { useEffect, useRef, useState } from "react";
import { Realtime } from "ably";
import {
  Room,
  createLocalTracks,
  RemoteVideoTrack,
} from "livekit-client";
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import "./ChatBox.css";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

const ably = new Realtime(process.env.NEXT_PUBLIC_ABLY_API_KEY);

function cleanupLocalTracks(room) {
  if (!room?.localParticipant?.tracks) return;
  for (const pub of room.localParticipant.tracks.values?.() || []) {
    const track = pub?.track;
    if (track) {
      track.stop();
      try {
        track.mediaStreamTrack?.stop();
      } catch (e) {}
      track.detach().forEach((el) => {
        el.srcObject = null;
        el.remove();
      });
    }
  }
}

export default function ChatBox({ conversationId, utilisateur }) {
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState("");
  const [participantsAutres, setParticipantsAutres] = useState([]);
  const [room, setRoom] = useState(null);
  const [inCall, setInCall] = useState(false);
  const [remoteTracks, setRemoteTracks] = useState([]);
  const [isTyping, setIsTyping] = useState(null);
  const [typingPseudo, setTypingPseudo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const localTracksRef = useRef([]);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const arrayBuffer = await blob.arrayBuffer();
        const audioContext = new AudioContext();
        let duree = "0:00";
        try {
          const decoded = await audioContext.decodeAudioData(arrayBuffer);
          const totalSeconds = decoded.duration;
          const minutes = Math.floor(totalSeconds / 60);
          const seconds = Math.floor(totalSeconds % 60);
          duree = `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
        } catch (e) {
          console.warn("⚠️ Erreur décodage audio :", e);
        }

        const formData = new FormData();
        formData.append("audio", blob, "enregistrement.webm");
        formData.append("conversationId", conversationId);
        formData.append("duree", duree);

        const res = await fetch("/api/messages/audio", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (data.success) {
          const channel = ably.channels.get(`conversation-${conversationId}`);
          channel.publish("message", data.message);
          setMessages((prev) => [...prev, data.message]);
        }
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (e) {
      console.error("❌ Erreur accès micro :", e);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleReaction = async (messageId, emoji) => {
    await fetch(`/api/messages/${messageId}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              reactions: [{ utilisateurId: utilisateur.id, emoji }],
            }
          : m
      )
    );

    const channel = ably.channels.get(`conversation-${conversationId}`);
    channel.publish("reaction", { messageId, emoji, utilisateurId: utilisateur.id });
  };

  const startCall = async (video = false) => {
    try {
      const res = await fetch("/api/livekit-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity: String(utilisateur.id), room: String(conversationId) }),
      });
      const { token } = await res.json();
      const tracks = await createLocalTracks({ audio: true, video });
      localTracksRef.current = tracks;

      const newRoom = new Room();

      newRoom.on("trackSubscribed", (track, publication, participant) => {
        if (track.kind === "video" && track instanceof RemoteVideoTrack) {
          setRemoteTracks((prev) => {
            if (prev.some((t) => t.id === participant.identity)) return prev;
            return [...prev, { id: participant.identity, track, nom: participant.identity }];
          });
        }
        if (track.kind === "audio") {
          const audio = document.createElement("audio");
          audio.autoplay = true;
          audio.srcObject = new MediaStream([track.mediaStreamTrack]);
          document.body.appendChild(audio);
        }
      });

      newRoom.on("participantDisconnected", (p) => {
        setRemoteTracks((prev) => prev.filter((t) => t.id !== p.identity));
      });

      await newRoom.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL, token, { tracks });
      setRoom(newRoom);
      setInCall(true);

      const localVideoTrack = tracks.find((t) => t.kind === "video");
      if (localVideoTrack) {
        const el = document.getElementById("local-video");
        if (el) localVideoTrack.attach(el);
      }

      const channel = ably.channels.get(`conversation-${conversationId}`);
      channel.publish("start-call", {
        auteurId: utilisateur.id,
        video,
        conversationId,
      });
    } catch (e) {
      console.error("❌ Erreur startCall :", e);
    }
  };

  const hangupCall = async () => {
    cleanupLocalTracks(room);
    if (room) await room.disconnect();
    setRoom(null);
    setRemoteTracks([]);
    setInCall(false);
  };

  const envoyerMessage = async () => {
    if (!texte.trim()) return;
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, contenu: texte, type: "TEXTE" }),
    });
    const data = await res.json();
    if (data.success) {
      const channel = ably.channels.get(`conversation-${conversationId}`);
      channel.publish("message", data.message);
      setMessages((prev) => [...prev, data.message]);
      setTexte("");
    }
  };

  useEffect(() => {
    if (!conversationId) return;
    const fetchMessages = async () => {
      const res = await fetch(`/api/messages?conversationId=${conversationId}`);
      const data = await res.json();
      setMessages(data.messages || []);
      setParticipantsAutres(data.destinataire ? [data.destinataire] : []);
    };
    fetchMessages();

    const channel = ably.channels.get(`conversation-${conversationId}`);
    channel.subscribe("start-call", (msg) => {
      if (msg.data.auteurId !== utilisateur.id && !inCall) startCall(msg.data.video);
    });
    channel.subscribe("end-call", (msg) => {
      if (msg.data.auteurId !== utilisateur.id) hangupCall();
    });
    channel.subscribe("typing", (msg) => {
      if (msg.data.auteurId !== utilisateur.id) {
        setTypingPseudo(msg.data.pseudo);
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 3000);
      }
    });

    return () => {
      channel.unsubscribe("start-call");
      channel.unsubscribe("end-call");
      channel.unsubscribe("typing");
    };
  }, [conversationId, inCall]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    remoteTracks.forEach(({ id, track }) => {
      const el = document.getElementById(`remote-video-${id}`);
      if (el && track) track.attach(el);
    });
  }, [remoteTracks]);

  return (
    <div className="chatbox-container">
      <ChatHeader
        participants={participantsAutres}
        onCallAudio={() => startCall(false)}
        onCallVideo={() => startCall(true)}
        onClose={hangupCall}
        inCall={inCall}
      />

      {inCall && (
        <div className="video-call-container">
          <div className="video-box local">
            <video id="local-video" autoPlay muted playsInline />
            <div className="video-label">Moi</div>
          </div>
          {remoteTracks.map(({ id, nom }) => (
            <div className="video-box" key={id}>
              <video id={`remote-video-${id}`} autoPlay playsInline />
              <div className="video-label">{nom || "Participant"}</div>
            </div>
          ))}
        </div>
      )}

      <div className="chat-messages">
        {isTyping && (
          <div className="typing-indicator">
            {typingPseudo || "Quelqu’un"} est en train d’écrire...
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            utilisateur={utilisateur}
            onReact={handleReaction}
          />
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
          value={texte}
          placeholder="Écris un message..."
          onChange={(e) => {
            setTexte(e.target.value);
            const channel = ably.channels.get(`conversation-${conversationId}`);
            channel.publish("typing", { auteurId: utilisateur.id, pseudo: utilisateur.pseudo });
          }}
          rows={1}
          style={{ resize: "none" }}
        />
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          className={`audio-btn ${recording ? "recording" : ""}`}
        >
          {recording ? "🟥" : "🎙️"}
        </button>
        <button
          type="button"
          className="emoji-btn"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        >
          😊
        </button>
        <button type="submit" className="message-btn">Envoyer</button>
      </form>

      {showEmojiPicker && (
        <div className="emoji-picker-container">
          <Picker
            data={data}
            onEmojiSelect={(emoji) => {
              setTexte((prev) => prev + emoji.native);
              setShowEmojiPicker(false);
            }}
            theme="light"
          />
        </div>
      )}
    </div>
  );
}
