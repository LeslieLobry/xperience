// hooks/useMessages.js
import { useState, useEffect } from "react";

export function useMessages(conversationId, utilisateur, setTexte) {
  const [messages, setMessages] = useState([]);
  const [participantsAutres, setParticipantsAutres] = useState([]);

  useEffect(() => {
    if (!conversationId) return;
    const fetchMessages = async () => {
      const res = await fetch(`/api/messages?conversationId=${conversationId}`);
      const data = await res.json();
      setMessages(data.messages || []);
      setParticipantsAutres(data.destinataire ? [data.destinataire] : []);
    };
    fetchMessages();
  }, [conversationId]);

  const envoyerMessage = async (texte) => {
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

  return { messages, setMessages, participantsAutres, envoyerMessage, handleReaction };
}
