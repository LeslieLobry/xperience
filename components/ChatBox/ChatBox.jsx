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

  return (
  <div className="chatbox-container">
    <ChatHeader participants={participantsAutres} inCall={inCall} setInCall={setInCall} />
    <VideoCallView {...{ conversationId, utilisateur, inCall, setInCall }} />

    <MessagesList
  messages={messages}
  utilisateur={utilisateur}
  onReact={handleReaction}
  typingPseudo={isTyping ? typingPseudo : null}
  lastReads={lastReads}
  hasMore={hasMore}
  onLoadMore={loadMoreMessages}
  onDelete={handleDelete}
/>


    <ChatInput {...{ utilisateur, conversationId, texte, setTexte, showEmojiPicker, setShowEmojiPicker, onMessageSent:
      (msg)=> setMessages((prev) => [...prev, msg]),
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
  </div>
  );
  }