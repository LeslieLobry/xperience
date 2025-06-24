import { useState, useEffect, useCallback } from "react";
import { Realtime } from "ably";

const ably = new Realtime(process.env.NEXT_PUBLIC_ABLY_API_KEY);

export function useMessages(conversationId, utilisateur, setTexte) {
  const [messages, setMessages] = useState([]);
  const [participantsAutres, setParticipantsAutres] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const MESSAGES_LIMIT = 30;

  // Chargement initial
  useEffect(() => {
    if (!conversationId) return;
    const fetchMessages = async () => {
      const res = await fetch(
        `/api/messages?conversationId=${conversationId}&limit=${MESSAGES_LIMIT}`
      );
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
        setParticipantsAutres(data.destinataire ? [data.destinataire] : []);
        setHasMore((data.messages || []).length === MESSAGES_LIMIT);
      }
    };
    fetchMessages();
  }, [conversationId]);

  // Chargement des anciens messages
  const loadMoreMessages = useCallback(async () => {
    if (!conversationId || isLoadingMore || !hasMore || messages.length === 0) return;
    setIsLoadingMore(true);
    const oldestMessageId = messages[0]?.id;

    const res = await fetch(
      `/api/messages?conversationId=${conversationId}&beforeId=${oldestMessageId}&limit=${MESSAGES_LIMIT}`
    );
    const data = await res.json();

    if (data.success && data.messages) {
      setMessages((prev) => [...data.messages, ...prev]);
      setHasMore(data.messages.length === MESSAGES_LIMIT);
    }

    setIsLoadingMore(false);
  }, [conversationId, messages, isLoadingMore, hasMore]);

  // Envoi d’un message texte
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

  // Réaction à un message
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

  return {
    messages,
    setMessages,
    participantsAutres,
    envoyerMessage,
    handleReaction,
    hasMore,
    loadMoreMessages,
  };
}
