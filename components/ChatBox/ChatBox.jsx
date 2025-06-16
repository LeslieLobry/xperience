"use client";

import { useEffect, useRef, useState } from "react";
import { Realtime } from "ably";
import { Room, createLocalTracks } from "livekit-client";
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import "./ChatBox.css";

import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

const ably = new Realtime(process.env.NEXT_PUBLIC_ABLY_API_KEY);

export default function ChatBox({ conversationId, utilisateur }) {
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [participantsAutres, setParticipantsAutres] = useState([]);
  const [room, setRoom] = useState(null);
  const [inCall, setInCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesEndRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
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
        fetch(`/api/conversations/${conversationId}/mark-as-read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: utilisateur.id }),
        }).catch((err) => console.error("❌ Erreur mark-as-read :", err));
      }
    };

    const handleMessage = (msg) => {
      if (msg.data.conversationId === conversationId) {
        setMessages((prev) => [...prev, msg.data]);
        scrollToBottom();
      }
    };

    const handleAppelEntrant = (msg) => {
      const data = msg.data;
      if (data.expediteur.id === utilisateur.id) return;
      setIncomingCall(data);
      ringtoneRef.current?.play();
    };

    const handleAppelTermine = () => {
      if (room) room.disconnect();
      setRoom(null);
      setInCall(false);
      setIncomingCall(null);
      ringtoneRef.current?.pause();
      ringtoneRef.current.currentTime = 0;
    };

    channel.subscribe("message", handleMessage);
    channel.subscribe("appel-entrant", handleAppelEntrant);
    channel.subscribe("appel-termine", handleAppelTermine);
    chargerMessages();

    fetch(`/api/conversations/${conversationId}`)
      .then((res) => res.json())
      .then((data) => {
        const autres = (data.conversation?.participants || []).filter(
          (p) => p.utilisateurId !== utilisateur.id
        ).map((p) => p.utilisateur);

        setParticipantsAutres(autres);
      });

    return () => {
      channel.unsubscribe("message", handleMessage);
      channel.unsubscribe("appel-entrant", handleAppelEntrant);
      channel.unsubscribe("appel-termine", handleAppelTermine);
    };
  }, [conversationId]);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const envoyerMessage = async () => {
    if (!texte.trim() && !imageFile) return;

    const convChannel = ably.channels.get(`conversation-${conversationId}`);
    const notifChannel = ably.channels.get(`notification-${utilisateur.id}`);

    let data;

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

      const json = await res.json();
      data = json.message;
    } else {
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

      const json = await res.json();
      data = json.message;
    }

    convChannel.publish("message", data);
    notifChannel.publish("message", { type: "refresh-conversations" });

    setTexte("");
    setImageFile(null);
  };

  const startCall = async (video = false) => {
    ringtoneRef.current?.pause();
    ringtoneRef.current.currentTime = 0;

    try {
      const res = await fetch("/api/livekit-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity: utilisateur.pseudo, room: String(conversationId) }),
      });

      const { token } = await res.json();
      const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

      const tracks = await createLocalTracks({ audio: true, video });
      const newRoom = new Room();
      await newRoom.connect(livekitUrl, token, { tracks });

      await newRoom.localParticipant.setMicrophoneEnabled(true);
      if (video) await newRoom.localParticipant.setCameraEnabled(true);

      newRoom.on("trackSubscribed", (track) => {
        if (track.kind === "video" && remoteVideoRef.current) {
          track.attach(remoteVideoRef.current);
        }
      });

      setTimeout(() => {
        const videoPub = newRoom.localParticipant.getTrackPublications()
          .find(pub => pub.track?.kind === "video");

        if (videoPub?.track && localVideoRef.current) {
          videoPub.track.attach(localVideoRef.current);
        }
      }, 500);

      setRoom(newRoom);
      setInCall(true);
      setIncomingCall(null);

      const channel = ably.channels.get(`conversation-${conversationId}`);
      channel.publish("appel-entrant", {
        type: video ? "video" : "audio",
        expediteur: {
          id: utilisateur.id,
          pseudo: utilisateur.pseudo,
          photoUrl: utilisateur.photoUrl || null,
        },
        conversationId,
      });
    } catch (err) {
      console.error("Erreur LiveKit :", err);
    }
  };

  const hangupCall = () => {
    room?.disconnect();
    setRoom(null);
    setInCall(false);
    const channel = ably.channels.get(`conversation-${conversationId}`);
    channel.publish("appel-termine", { conversationId });
  };

  const accepterAppel = (type) => {
    ringtoneRef.current?.pause();
    ringtoneRef.current.currentTime = 0;
    startCall(type === "video");
  };

  return (
    <div className="chatbox-container">
      <audio ref={ringtoneRef} src="/sounds/ringtone.mp3" loop preload="auto" />

      <ChatHeader
        nom={
          Array.isArray(participantsAutres)
            ? participantsAutres.map((u) => u.pseudo).join(", ")
            : ""
        }
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

      {incomingCall && !inCall && !room && (
        <div className="appel-entrant-box">
          <p>📞 Appel {incomingCall.type} de {incomingCall.expediteur.pseudo}</p>
          <button onClick={() => accepterAppel(incomingCall.type)}>Accepter</button>
          <button onClick={() => {
            setIncomingCall(null);
            ringtoneRef.current?.pause();
            ringtoneRef.current.currentTime = 0;
          }}>Refuser</button>
        </div>
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
        <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
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
