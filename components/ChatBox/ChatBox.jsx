// Nouveau fichier : ChatBox.jsx (version allégée)
"use client";

import { useEffect, useRef, useState } from "react";
import { Realtime } from "ably";
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import ChatInput from "../ChatInput/ChatInput";
import VideoCallView from "../VideoCallView/VideoCallView";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import "./ChatBox.css";

const ably = new Realtime(process.env.NEXT_PUBLIC_ABLY_API_KEY);

export default function ChatBox({ conversationId, utilisateur }) {
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState("");
  const [participantsAutres, setParticipantsAutres] = useState([]);
  const [isTyping, setIsTyping] = useState(null);
  const [typingPseudo, setTypingPseudo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [inCall, setInCall] = useState(false);
  const messagesEndRef = useRef(null);

  const handleReaction = async (messageId, emoji) => {
    await fetch(`/api/messages/${messageId}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, reactions: [{ utilisateurId: utilisateur.id, emoji }] }
          : m
      )
    );

    const channel = ably.channels.get(`conversation-${conversationId}`);
    channel.publish("reaction", { messageId, emoji, utilisateurId: utilisateur.id });
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
    channel.subscribe("typing", (msg) => {
      if (msg.data.auteurId !== utilisateur.id) {
        setTypingPseudo(msg.data.pseudo);
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 3000);
      }
    });

    return () => channel.unsubscribe("typing");
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="chatbox-container">
      <ChatHeader participants={participantsAutres} inCall={inCall} setInCall={setInCall} />

      <VideoCallView
        conversationId={conversationId}
        utilisateur={utilisateur}
        inCall={inCall}
        setInCall={setInCall}
      />

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

      <ChatInput
        utilisateur={utilisateur}
        conversationId={conversationId}
        onMessageSent={(message) => setMessages((prev) => [...prev, message])}
        onTyping={() => {
          const channel = ably.channels.get(`conversation-${conversationId}`);
          channel.publish("typing", {
            auteurId: utilisateur.id,
            pseudo: utilisateur.pseudo,
          });
        }}
      />

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
