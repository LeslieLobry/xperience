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
import MessageAudio from "./MessageAudio";
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
      if (track.mediaStreamTrack) {
        try {
          track.mediaStreamTrack.stop();
        } catch (e) {
          console.warn("⚠️ mediaStreamTrack déjà stoppé :", e);
        }
      }
      track.detach().forEach((el) => {
        try {
          el.srcObject = null;
          el.remove();
        } catch (err) {
          console.warn("Erreur nettoyage DOM caméra :", err);
        }
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const localTracksRef = useRef([]);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const ringtoneRef = useRef(null);

  // 🎙️ Enregistrement audio
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
        const formData = new FormData();
        formData.append("audio", blob);
        formData.append("conversationId", conversationId);

        try {
          const res = await fetch("/api/messages/audio", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();
          if (!data.success) {
            console.error("❌ Audio non enregistré :", data.message);
            return;
          }

          const nouveauMessage = data.message;
          const channel = ably.channels.get(`conversation-${conversationId}`);
          channel.publish("message", nouveauMessage);
          setMessages((prev) => [...prev, nouveauMessage]);
        } catch (err) {
          console.error("❌ Erreur envoi audio :", err);
        }
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      console.error("Erreur accès micro :", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const adjustTextareaHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  const notifyTyping = () => {
    const channel = ably.channels.get(`conversation-${conversationId}`);
    channel.publish("typing", {
      auteurId: utilisateur.id,
      pseudo: utilisateur.pseudo,
      conversationId,
    });
  };

  const startCall = async (video = false) => {
    try {
      console.log("📞 Lancement d’un appel", { video });

      const res = await fetch("/api/livekit-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity: String(utilisateur.id), room: String(conversationId) }),
      });

      const { token } = await res.json();
      const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

      const tracks = await createLocalTracks({ audio: true, video });
      localTracksRef.current = tracks;
      const newRoom = new Room();

      newRoom.on("trackSubscribed", (track, publication, participant) => {
        if (track.kind === "video" && track instanceof RemoteVideoTrack) {
          console.log("🎥 Nouveau remote track :", participant.identity, track);
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

      newRoom.on("participantConnected", (p) => {
        console.log("✅ Participant connecté :", p.identity);
      });

      newRoom.on("participantDisconnected", (p) => {
        console.log("❌ Participant déconnecté :", p.identity);
        setRemoteTracks((prev) => prev.filter((t) => t.id !== p.identity));
      });

      await newRoom.connect(livekitUrl, token, { tracks });
      console.log("🔗 Room connectée :", newRoom.name);

      setRoom(newRoom);
      setInCall(true);

      const localVideoTrack = tracks.find((t) => t.kind === "video");
      if (localVideoTrack) {
        const tryAttach = setInterval(() => {
          const el = document.getElementById("local-video");
          if (el) {
            localVideoTrack.attach(el);
            clearInterval(tryAttach);
          }
        }, 100);
        setTimeout(() => clearInterval(tryAttach), 3000);
      }

      const channel = ably.channels.get(`conversation-${conversationId}`);
      channel.publish("start-call", {
        auteurId: utilisateur.id,
        video,
        conversationId,
      });
    } catch (err) {
      console.error("❌ Erreur lors de l'appel :", err);
      alert("Impossible d'accéder à la caméra/micro. Vérifie les autorisations.");
    }
  };

  const hangupCall = async () => {
    try {
      cleanupLocalTracks(room);
      localTracksRef.current.forEach((track) => {
        try {
          track.stop();
          track.mediaStreamTrack?.stop();
        } catch (e) {
          console.warn("Erreur arrêt localTrack direct :", e);
        }
      });
      localTracksRef.current = [];

      if (room) await room.disconnect();

      const channel = ably.channels.get(`conversation-${conversationId}`);
      channel.publish("end-call", {
        auteurId: utilisateur.id,
      });

      setRoom(null);
      setRemoteTracks([]);
      setInCall(false);

      const localVideo = document.getElementById("local-video");
      if (localVideo) {
        localVideo.pause();
        localVideo.srcObject = null;
        localVideo.removeAttribute("src");
        localVideo.load();
      }

      document.querySelectorAll("audio").forEach((a) => {
        a.pause();
        a.srcObject = null;
        a.remove();
      });
    } catch (error) {
      console.error("❌ Erreur pendant le raccrochage :", error);
    }
  };

  const handleChange = (e) => {
    setTexte(e.target.value);
    adjustTextareaHeight();
    notifyTyping();
  };

  const envoyerMessage = async () => {
    if (!texte.trim()) return;

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          contenu: texte,
          type: "TEXTE",
        }),
      });

      const data = await res.json();
      if (!data.success) {
        console.error("❌ Message non enregistré :", data.message);
        return;
      }

      const nouveauMessage = data.message;
      const channel = ably.channels.get(`conversation-${conversationId}`);
      channel.publish("message", nouveauMessage);

      setMessages((prev) => [...prev, nouveauMessage]);
      setTexte("");
      textareaRef.current.style.height = "auto";
    } catch (err) {
      console.error("❌ Erreur lors de l’envoi du message :", err);
    }
  };

  useEffect(() => {
    if (!conversationId) return;
    console.log("📥 Conversation ID reçu :", conversationId);

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/messages?conversationId=${conversationId}`);
        const data = await res.json();
        setMessages(data.messages || []);
        setParticipantsAutres(data.destinataire ? [data.destinataire] : []);
      } catch (err) {
        console.error("❌ Erreur chargement messages :", err);
      }
    };

    fetchMessages();

    const channel = ably.channels.get(`conversation-${conversationId}`);

    const handleStartCall = (msg) => {
      if (msg.data.auteurId !== utilisateur.id && !inCall) {
        console.log("📞 Appel reçu");
        startCall(msg.data.video);
      }
    };

    const handleEndCall = (msg) => {
      if (msg.data.auteurId !== utilisateur.id) {
        console.log("📴 Appel terminé par l’autre utilisateur");
        hangupCall();
      }
    };

    const handleTyping = (msg) => {
      if (msg.data.auteurId !== utilisateur.id) {
        setIsTyping(`${msg.data.pseudo}`);
        setTimeout(() => setIsTyping(null), 2000);
      }
    };

    channel.subscribe("start-call", handleStartCall);
    channel.subscribe("end-call", handleEndCall);
    channel.subscribe("typing", handleTyping);

    return () => {
      channel.unsubscribe("start-call", handleStartCall);
      channel.unsubscribe("end-call", handleEndCall);
      channel.unsubscribe("typing", handleTyping);
    };
  }, [conversationId, inCall]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    remoteTracks.forEach(({ id, track }) => {
      const el = document.getElementById(`remote-video-${id}`);
      if (el && track && typeof track.attach === "function") {
        console.log("📷 Attaching remote track", track, "to element", el);
        track.attach(el);
      }
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
          <div className="video-box local floating">
            <video id="local-video" autoPlay muted playsInline />
            <div className="video-label">Moi</div>
          </div>
          {remoteTracks.map(({ id, nom }) => (
            <div className="video-box" key={id}>
              <video id={`remote-video-${id}`} autoPlay playsInline />
              <div className="video-label">{nom || "Participant"}</div>
            </div>
          ))}
          <button onClick={hangupCall} className="hangup-button">🛑 Raccrocher</button>
        </div>
      )}

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            utilisateur={utilisateur}
            previousMsg={messages[i - 1]}
            lastReads={participantsAutres.map(p => ({ utilisateurId: p.id, lastReadAt: p.lastReadAt }))}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {isTyping && <div className="typing-indicator">{isTyping} est en train d’écrire...</div>}

      <form className="chat-input" onSubmit={(e) => { e.preventDefault(); envoyerMessage(); }}>
        <textarea
          ref={textareaRef}
          className="input-text"
          placeholder="Écrire un message..."
          value={texte}
          onChange={handleChange}
          rows={1}
          style={{ overflow: "hidden", resize: "none" }}
        />
        {/* 🎙️ Bouton audio */}
        <button
          type="button"
          className={`audio-btn ${recording ? "recording" : ""}`}
          onClick={recording ? stopRecording : startRecording}
        >
          {recording ? "🟥 Stop" : "🎙️"}
        </button>

        <button type="button" className="emoji-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>😊</button>
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

      <audio ref={ringtoneRef} src="/ringtone.mp3" loop />
    </div>
  );
}
