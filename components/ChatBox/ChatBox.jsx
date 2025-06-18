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

const ably = new Realtime(process.env.NEXT_PUBLIC_ABLY_API_KEY);

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

  const adjustTextareaHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  const handleChange = (e) => {
    setTexte(e.target.value);
    adjustTextareaHeight();
    notifyTyping();
  };

  const notifyTyping = () => {
    const channel = ably.channels.get(`conversation-${conversationId}`);
    channel.publish("typing", {
      auteurId: utilisateur.id,
      pseudo: utilisateur.pseudo,
      conversationId,
    });
  };

  useEffect(() => {
    if (!conversationId) return;

    const channel = ably.channels.get(`conversation-${conversationId}`);

    const chargerMessages = async () => {
      const res = await fetch(`/api/messages?conversationId=${conversationId}`);
      const data = await res.json();
      setMessages(data.messages || []);
      scrollToBottom();

      if (utilisateur?.id) {
        await fetch(`/api/conversations/${conversationId}/mark-as-read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: utilisateur.id }),
        });
      }
    };

    const handleMessage = (msg) => {
      if (msg.data.conversationId === conversationId) {
        setMessages((prev) => [...prev, msg.data]);
        scrollToBottom();

        fetch("/api/messages/acknowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messageId: msg.data.id,
            statut: "recu",
            utilisateurId: utilisateur.id,
          }),
        });
      }
    };

    const handleTyping = (msg) => {
      if (msg.data.auteurId !== utilisateur.id) {
        setIsTyping(msg.data.pseudo);
        setTimeout(() => setIsTyping(null), 2000);
      }
    };

    const handleEndCall = (msg) => {
      if (msg.data.auteurId !== utilisateur.id) {
        console.log("📞 Appel terminé par l’autre utilisateur");
        hangupCall();
      }
    };

    channel.subscribe("message", handleMessage);
    channel.subscribe("typing", handleTyping);
    channel.subscribe("end-call", handleEndCall);

    chargerMessages();

    fetch(`/api/conversations/${conversationId}`)
      .then((res) => res.json())
      .then((data) => {
        const autres = (data.participants || []).filter(
          (p) => p.id !== utilisateur.id
        );
        setParticipantsAutres(autres);
      });

    return () => {
      channel.unsubscribe("message", handleMessage);
      channel.unsubscribe("typing", handleTyping);
      channel.unsubscribe("end-call", handleEndCall);
    };
  }, [conversationId]);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const envoyerMessage = async () => {
    if (!texte.trim()) return;

    const payload = {
      auteurId: utilisateur.id,
      contenu: texte,
      type: "TEXTE",
      conversationId,
    };

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const { message } = await res.json();
    const channel = ably.channels.get(`conversation-${conversationId}`);
    const notif = ably.channels.get(`notification-${utilisateur.id}`);

    channel.publish("message", message);
    notif.publish("message", { type: "refresh-conversations" });

    setTexte("");
  };

  const startCall = async (video = false) => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }

    try {
      const res = await fetch("/api/livekit-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity: utilisateur.pseudo, room: String(conversationId) }),
      });

      const { token } = await res.json();
      const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

      const tracks = await createLocalTracks({ audio: true, video });
      localTracksRef.current = tracks;
      const newRoom = new Room();

      newRoom.on("trackSubscribed", (track, publication, participant) => {
        if (track.kind === "video" && track instanceof RemoteVideoTrack) {
          setRemoteTracks((prev) => {
            if (prev.find(t => t.id === participant.identity)) return prev;
            return [...prev, { id: participant.identity, track }];
          });
        }
        if (track.kind === "audio") {
          track.attach(document.createElement("audio")).play().catch(console.error);
        }
      });

      newRoom.on("trackUnsubscribed", (track, publication, participant) => {
        setRemoteTracks((prev) => prev.filter((t) => t.id !== participant.identity));
      });

      await newRoom.connect(livekitUrl, token, { tracks });

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

    } catch (err) {
      console.error("❌ Erreur lors de l'appel :", err);
      alert("Impossible d'accéder à la caméra/micro. Vérifie les autorisations.");
    }
  };

  const hangupCall = () => {
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

      if (room) {
        room.disconnect();
      }

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

      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
    } catch (error) {
      console.error("❌ Erreur pendant le raccrochage :", error);
    }
  };

  useEffect(() => {
    remoteTracks.forEach(({ id, track }) => {
      const el = document.getElementById(`remote-video-${id}`);
      if (el && track) {
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
          <video id="local-video" autoPlay muted playsInline />
          {remoteTracks.map(({ id }) => (
            <video key={id} id={`remote-video-${id}`} autoPlay playsInline />
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
