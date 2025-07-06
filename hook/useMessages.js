import { useState, useEffect, useCallback } from "react";
import { Realtime } from "ably";

const ably = new Realtime(process.env.NEXT_PUBLIC_ABLY_API_KEY);

export function useMessages(conversationId, utilisateur, setTexte) {
  const [messages, setMessages] = useState([]);
  const [participantsAutres, setParticipantsAutres] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastReads, setLastReads] = useState([]);
  const MESSAGES_LIMIT = 30;

  // Chargement initial des messages ET des statuts de lecture
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
        setLastReads(data.lastReads || []);  // ← ici !
      }
    };
    fetchMessages();
  }, [conversationId]);

  // Abonnement temps réel Ably pour cette conversation
  useEffect(() => {
    if (!conversationId) return;
    const channel = ably.channels.get(`conversation-${conversationId}`);

    // Nouveau message reçu
    const onMessage = (msg) => {
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === msg.data.id);
        if (exists) return prev;

        // Si le message n'est pas de moi, je signale "reçu" et "lu"
        if (msg.data.auteurId !== utilisateur.id) {
          // ACK (reçu)
          fetch("/api/messages/acknowledge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageId: msg.data.id }),
          });
          // LU (lu)
          fetch("/api/messages/mark-as-read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageId: msg.data.id }),
          });
        }

        return [...prev, msg.data];
      });
    };

    // Réaction reçue
    const onReaction = (msg) => {
      const { messageId, emoji, utilisateurId } = msg.data;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                reactions: [{ utilisateurId, emoji }],
              }
            : m
        )
      );
    };

    // Statut de lecture reçu en live (optionnel)
    const onRead = (msg) => {
      setLastReads((prev) => {
        const idx = prev.findIndex(r => r.utilisateurId === msg.data.utilisateurId);
        if (idx > -1) {
          const copy = [...prev];
          copy[idx] = msg.data;
          return copy;
        }
        return [...prev, msg.data];
      });
    };

    channel.subscribe("message", onMessage);
    channel.subscribe("reaction", onReaction);
    channel.subscribe("read", onRead);

    return () => {
      channel.unsubscribe("message", onMessage);
      channel.unsubscribe("reaction", onReaction);
      channel.unsubscribe("read", onRead);
    };
  }, [conversationId, utilisateur.id]);

  // Chargement des anciens messages (lazy loading)
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

  // Envoi d'un message
  const envoyerMessage = async (texte, type = "TEXTE", envoyeur, prenom1, prenom2) => {
    if (!texte.trim()) return null;

    const payload = {
      conversationId,
      contenu: texte,
      type,
    };
    if (envoyeur) payload.envoyeur = envoyeur;
    if (prenom1) payload.prenom1 = prenom1;
    if (prenom2) payload.prenom2 = prenom2;

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (data.success) {
      // Publie sur Ably pour tous les utilisateurs de la conv
      const channel = ably.channels.get(`conversation-${conversationId}`);
      channel.publish("message", data.message);
      setMessages((prev) => [...prev, data.message]);
      setTexte("");
      return data.message;
    }

    return null;
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
    lastReads,  
    setLastReads,
  };
}
