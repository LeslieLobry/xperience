"use client";

import { useEffect, useRef, useState } from "react";
import { Realtime } from "ably";
import {
  Room,
  createLocalTracks,
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
  const [appelRecu, setAppelRecu] = useState(null);
  const inCallRef = useRef(false);

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

  async function startCall(isVideoEnabled) {
    try {
      const roomName = String(conversationId);
      const identity = String(utilisateur?.id);
      const response = await fetch("/api/token", {
        method: "POST",
        body: JSON.stringify({ identity, room: roomName }),
      });
      const data = await response.json();
      const token = data.token;
      const tracks = await createLocalTracks({ audio: true, video: isVideoEnabled });
      const newRoom = new Room();
      setRoom(newRoom);

      newRoom.on("participantConnected", (participant) => {
        console.log("👤 participantConnected :", participant.identity);
      });

      newRoom.on("participantDisconnected", (participant) => {
        console.log("🚪 participantDisconnected :", participant.identity);
      });

      newRoom.on("trackSubscribed", (track, publication, participant) => {
        console.log("🎧 trackSubscribed:", participant.identity, track.kind);
        setRemoteTracks(prev => {
          const already = prev.find(rt => rt.id === participant.identity && rt.track.kind === track.kind);
          if (!already) {
            return [...prev, { id: participant.identity, track }];
          }
          return prev;
        });
      });

      await newRoom.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL, token, { autoSubscribe: true });
      newRoom.localParticipant.publishTracks(tracks);
      setInCall(true);
      inCallRef.current = true;

    } catch (err) {
      console.error("❌ Erreur startCall :", err);
    }
  }

  const hangupCall = () => {
    if (!inCallRef.current) return;
    inCallRef.current = false;
    setInCall(false);
    try {
      cleanupLocalTracks(room);
      room?.disconnect();
      ably.channels.get(`conversation-${conversationId}`).publish("end-call", {
        auteurId: utilisateur.id,
      });
      setRoom(null);
      setRemoteTracks([]);
    } catch (error) {
      console.error("❌ Erreur raccrochage :", error);
    }
  };

const envoyerMessage = async () => {
  if (!texte.trim()) return;

  const nouveauMessage = {
    contenu: texte,
    conversationId,
    type: "TEXTE", // ou "text", selon ton modèle
  };

  try {
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nouveauMessage),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      console.error("❌ Erreur lors de l’envoi du message :", data.message);
      return;
    }

    ably.channels.get(`conversation-${conversationId}`).publish("message", data.message);
    setMessages((prev) => [...prev, data.message]);
    setTexte("");
    textareaRef.current.style.height = "auto";
  } catch (err) {
    console.error("❌ Erreur réseau lors de l’envoi du message :", err);
  }
};

      setParticipantsAutres(data.destinataire ? [data.destinataire] : []);
    };
    fetchMessages();

    const channel = ably.channels.get(`conversation-${conversationId}`);
    const handleStartCall = (msg) => {
      if (msg.data.auteurId !== utilisateur.id && !inCallRef.current) {
        setAppelRecu(msg.data);
        ringtoneRef.current?.play();
      }
    };
    const handleEndCall = (msg) => {
      if (msg.data.auteurId !== utilisateur.id && inCallRef.current) {
        hangupCall();
      }
    };
    const handleTyping = (msg) => {
      if (msg.data.auteurId !== utilisateur.id) {
        setIsTyping(`${msg.data.pseudo}`);
        setTimeout(() => setIsTyping(null), 2000);
      }
    };
    const handleMessage = (msg) => {
      if (msg.data.conversationId !== conversationId) return;
      setMessages((prev) => [...prev, { ...msg.data, id: Date.now() }]);
    };

    channel.subscribe("start-call", handleStartCall);
    channel.subscribe("end-call", handleEndCall);
    channel.subscribe("typing", handleTyping);
    channel.subscribe("message", handleMessage);

    return () => {
      channel.unsubscribe("start-call", handleStartCall);
      channel.unsubscribe("end-call", handleEndCall);
      channel.unsubscribe("typing", handleTyping);
      channel.unsubscribe("message", handleMessage);
       ably.channels.release(`conversation-${conversationId}`)
    };
  }, [conversationId]);

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
            lastReads={participantsAutres.map(p => ({
              utilisateurId: p.id,
              lastReadAt: p.lastReadAt,
            }))}
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
          onChange={(e) => {
            setTexte(e.target.value);
            adjustTextareaHeight();
            notifyTyping();
          }}
          rows={1}
          style={{ overflow: "hidden", resize: "none" }}
        />
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

      {appelRecu && (
        <div className="appel-recu-popup">
          <div className="appel-popup-contenu">
            <p><strong>{appelRecu.auteurPseudo}</strong> vous appelle pour un {appelRecu.video ? "appel vidéo" : "appel audio"}.</p>
            <div className="appel-popup-actions">
              <button onClick={() => {
  ringtoneRef.current?.pause();
  setAppelRecu(null);
  // ⚠️ Forcer startCall même si déjà en appel localement
  setTimeout(() => {
    inCallRef.current = false;
    startCall(appelRecu.video);
  }, 50);
}}>
  ✅ Accepter
</button>

              <button onClick={() => {
                ringtoneRef.current?.pause();
                setAppelRecu(null);
              }}>❌ Refuser</button>
            </div>
          </div>
        </div>
      )}

      <audio ref={ringtoneRef} src="/ringtone.mp3" loop />
    </div>
  );
}
