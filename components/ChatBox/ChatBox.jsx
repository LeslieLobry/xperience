"use client";

import { useEffect, useRef, useState } from "react";
import { Realtime } from "ably";
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import ChatInput from "../ChatInput/ChatInput";
import VideoCallView from "../VideoCallView/VideoCallView";
import dynamic from "next/dynamic";
import data from "@emoji-mart/data";
import "./ChatBox.css";
import { useMessages } from "../../hook/useMessages";
import { useTyping } from "../../hook/useTyping";
import MessagesList from "../MessagesList";
import Spinner from "../Spinner/Spinner";
import { createLocalTracks, Room } from "livekit-client";
import NotificationAppelEntrant from "../NotificationAppelEntrant/NotificationAppelEntrant";

const Picker = dynamic(() => import("@emoji-mart/react"), { ssr: false });
const ably = new Realtime(process.env.NEXT_PUBLIC_ABLY_API_KEY);

export default function ChatBox({ conversationId, utilisateur }) {
const [texte, setTexte] = useState("");
const [showEmojiPicker, setShowEmojiPicker] = useState(false);
const [inCall, setInCall] = useState(false);
const [recording, setRecording] = useState(false);
const [lastReads, setLastReads] = useState([]);
const mediaRecorderRef = useRef(null);
const audioChunks = useRef([]);
const [hasMore, setHasMore] = useState(false);
const [room, setRoom] = useState(null);
const [remoteTracks, setRemoteTracks] = useState([]);
const [appelEntrant, setAppelEntrant] = useState(null);
const sonnerieRef = useRef(null);
const appelTimeoutRef = useRef(null);
const {
messages,
setMessages,
participantsAutres,
envoyerMessage,
handleReaction,
loadMoreMessages,
} = useMessages(conversationId, utilisateur, setTexte);

const { isTyping, typingPseudo, envoyerTyping } = useTyping(conversationId, utilisateur);
useEffect(() => {
async function fetchLastReads() {
if (!conversationId) return;
try {
const res = await fetch(`/api/last-reads?conversationId=${conversationId}`);
const data = await res.json();
if (data.success) {
setLastReads(data.lastReads);
}
} catch (err) {
console.error("Erreur fetch lastReads:", err);
}
}
fetchLastReads();
}, [conversationId]);

const startRecording = async () => {
try {
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
mediaRecorderRef.current = new MediaRecorder(stream);
audioChunks.current = [];

mediaRecorderRef.current.ondataavailable = (event) => {
if (event.data.size > 0) {
audioChunks.current.push(event.data);
}
};

mediaRecorderRef.current.onstop = async () => {
const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });

const duree = await new Promise((resolve) => {
const audio = new Audio();
audio.src = URL.createObjectURL(audioBlob);
audio.onloadedmetadata = () => {
const d = audio.duration;
const minutes = Math.floor(d / 60);
const secondes = Math.floor(d % 60);
resolve(`${minutes}:${secondes < 10 ? "0" : "" }${secondes}`); }; }); const formData=new FormData();
  formData.append("audio", audioBlob); formData.append("conversationId", conversationId);
  formData.append("type", "AUDIO" ); formData.append("duree", duree); const res=await fetch("/api/messages/audio", {
  method: "POST" , body: formData, }); const data=await res.json(); if (data.success) { setMessages((prev)=> [...prev,
  data.message]);
  } else {
  console.warn("❌ Échec de l’envoi audio :", data);
  }
  };

  mediaRecorderRef.current.start();
  setRecording(true);
  } catch (err) {
  console.error("Erreur lors du démarrage de l’enregistrement :", err);
  }
  };

  const stopRecording = () => {
  if (mediaRecorderRef.current) {
  mediaRecorderRef.current.stop();
  setRecording(false);
  mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
  }
  };
  const handleDelete = async (messageId) => {
  try {
  const res = await fetch(`/api/messages/${messageId}`, {
  method: "DELETE",
  });
  if (!res.ok) throw new Error("Erreur lors de la suppression");

  setMessages((prev) => prev.filter((m) => m.id !== messageId));
  } catch (err) {
  console.error("Erreur suppression message :", err);
  }
  };
const startCall = async (video = true) => {
  const res = await fetch("/api/livekit/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identity: `user_${utilisateur.id}`,
      room: conversationId,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.token) {
    console.error("❌ Erreur token LiveKit :", data);
    return;
  }

  const token = data.token;

  const newRoom = new Room();
  setRoom(newRoom);

  newRoom.on("trackSubscribed", (track, publication, participant) => {
    console.log("🎥 trackSubscribed from", participant.identity);
    setRemoteTracks((prev) => [
      ...prev.filter((t) => t.id !== participant.identity),
      { id: participant.identity, nom: participant.identity, track },
    ]);
  });

  newRoom.on("trackUnsubscribed", (track, publication, participant) => {
    console.log("📴 trackUnsubscribed", participant.identity);
    setRemoteTracks((prev) => prev.filter((t) => t.id !== participant.identity));
  });

  const localTracks = await createLocalTracks({ audio: true, video });
  console.log("🎥 localTracks:", localTracks);

  const localVideoTrack = localTracks.find((t) => t.kind === "video");
  if (localVideoTrack) {
    console.log("✅ window.localVideoTrack defined");
    window.localVideoTrack = localVideoTrack;
  }

  await newRoom.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL, token);
  localTracks.forEach((track) => newRoom.localParticipant.publishTrack(track));

  setInCall(true);

  participantsAutres.forEach((p) => {
    ably.channels.get(`notification-${p.id}`).publish("call:incoming", {
      from: utilisateur,
      room: conversationId,
      type: video ? "video" : "audio",
    });
  });
};
const hangupCall = () => {
  if (room) {
    const localTracks = room.localParticipant?.tracks;
    localTracks?.forEach((publication) => {
      const track = publication.track;
      if (track) {
        track.stop();
        room.localParticipant.unpublishTrack(track);
      }
    });
    room.disconnect();
    setRoom(null);
    setRemoteTracks([]);
    setInCall(false);
    if (window.localVideoTrack) {
      window.localVideoTrack.stop();
      delete window.localVideoTrack;
    }
  }
};
  useEffect(() => {
  if (!utilisateur?.id) return;
  const channel = ably.channels.get(`notification-${utilisateur.id}`);
const handleIncomingCall = (msg) => {
  const { from, room, type } = msg.data;
  if (inCall) {
    ably.channels.get(`notification-${from.id}`).publish("call:busy", {
      from: utilisateur,
      room: conversationId,
    });
    return;
  }
  setAppelEntrant({ from, room, type });
  if (sonnerieRef.current) {
    sonnerieRef.current.currentTime = 0;
    sonnerieRef.current.play().catch((e) =>
      console.warn("🔇 Erreur lecture sonnerie", e)
    );
  }
appelTimeoutRef.current = setTimeout(async () => {
  console.log("⏰ Appel expiré (aucune réponse)");
  setAppelEntrant(null);
  if (sonnerieRef.current) {
    sonnerieRef.current.pause();
    sonnerieRef.current.currentTime = 0;
  }

  ably.channels.get(`notification-${from.id}`).publish("call:refused", {
    from: utilisateur,
    room: conversationId,
  });

  try {
    await envoyerMessage("📵 Appel manqué", "TEXTE");
  } catch (err) {
    console.warn("❌ Erreur envoi message 'appel manqué' :", err);
  }
}, 20000);

};


  channel.subscribe("call:incoming", handleIncomingCall);

  return () => {
  channel.unsubscribe("call:incoming", handleIncomingCall);
  };
  }, [utilisateur, inCall]);

  // ✅ AJOUT écoute refus ou occupation
  useEffect(() => {
  if (!utilisateur?.id) return;

  const channel = ably.channels.get(`notification-${utilisateur.id}`);

  const handleRefused = (msg) => {
  alert(`${msg.data.from?.pseudo || "L'utilisateur"} a refusé l'appel.`);
  };

  const handleBusy = (msg) => {
  alert(`${msg.data.from?.pseudo || "L'utilisateur"} est déjà en appel.`);
  };

  channel.subscribe("call:refused", handleRefused);
  channel.subscribe("call:busy", handleBusy);
const handleCallEnded = (msg) => {
  console.log("📴 Appel terminé par l'appelant", msg.data);
  setAppelEntrant(null);
  if (sonnerieRef.current) {
    sonnerieRef.current.pause();
    sonnerieRef.current.currentTime = 0;
  }
};

channel.subscribe("call:ended", handleCallEnded);

  return () => {
  channel.unsubscribe("call:refused", handleRefused);
  channel.unsubscribe("call:busy", handleBusy);
  channel.unsubscribe("call:ended", handleCallEnded);
  };
  }, [utilisateur]);


  return (
  <div className="chatbox-container">
    <ChatHeader participants={participantsAutres} inCall={inCall} onCallAudio={startCall} onCallVideo={startCall}
      onClose={hangupCall} />

    <VideoCallView inCall={inCall} remoteTracks={remoteTracks} startCall={startCall} hangupCall={hangupCall} />


    {!messages.length ? (
    <Spinner />
    ) : (
    <MessagesList messages={messages} utilisateur={utilisateur} onReact={handleReaction} typingPseudo={isTyping ?
      typingPseudo : null} lastReads={lastReads} hasMore={hasMore} onLoadMore={loadMoreMessages}
      onDelete={handleDelete} />
    )}
    <ChatInput {...{ utilisateur, conversationId, texte, setTexte, showEmojiPicker, setShowEmojiPicker, onMessageSent:
      async (contenu, type="TEXTE" )=> {
      await envoyerMessage(contenu, type);
      },
      onTyping: envoyerTyping,
      startRecording,
      stopRecording,
      recording,
      }}
      />

      {showEmojiPicker && (
      <div className="emoji-picker-container">
        <Picker data={data} onEmojiSelect={(emoji)=> {
          setTexte((prev) => prev + emoji.native);
          setShowEmojiPicker(false);
          }}
          theme="light"
          />
      </div>
      )}
      <NotificationAppelEntrant appel={appelEntrant} onAccepter={(type) => {
  if (appelTimeoutRef.current) {
    clearTimeout(appelTimeoutRef.current);
    appelTimeoutRef.current = null;
  }
  setAppelEntrant(null);
  if (sonnerieRef.current) {
    sonnerieRef.current.pause();
    sonnerieRef.current.currentTime = 0;
  }
  startCall(type === "video");
}}


onRefuser={() => {
  if (appelTimeoutRef.current) {
    clearTimeout(appelTimeoutRef.current);
    appelTimeoutRef.current = null;
  }

  setAppelEntrant(null);

  if (sonnerieRef.current) {
    sonnerieRef.current.pause();
    sonnerieRef.current.currentTime = 0;
  }

  participantsAutres.forEach((p) => {
    ably.channels.get(`notification-${p.id}`).publish("call:refused", {
      from: utilisateur,
      room: conversationId,
    });
  });
}}
  />
  <audio ref={sonnerieRef} src="/sonnerie.mp3" preload="auto" /> {/* ✅ AJOUT sonnerie */}
  </div>
  );
  }