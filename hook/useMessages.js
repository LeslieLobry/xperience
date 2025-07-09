import { useState, useEffect, useCallback, useRef } from "react";
import { Realtime } from "ably";

const ably = new Realtime(process.env.NEXT_PUBLIC_ABLY_API_KEY);

export function useMessages(conversationId, utilisateur, setTexte) {
  const [messages, setMessages] = useState([]);
  const [participantsAutres, setParticipantsAutres] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastReads, setLastReads] = useState([]);
  const MESSAGES_LIMIT = 30;

  // Référence pour stocker les timers d'effacement des messages éphémères
  const ephemeralTimers = useRef({});

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
        setLastReads(data.lastReads || []);
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
        // ACK et LU
        if (msg.data.auteurId !== utilisateur.id) {
          fetch("/api/messages/acknowledge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageId: msg.data.id }),
          });
          fetch("/api/messages/mark-as-read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageId: msg.data.id }),
          });
        }
        return [...prev, msg.data];
      });
    };

    // Réaction reçue (liste complète)
    const onReaction = (msg) => {
      const { messageId, reactions } = msg.data;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, reactions }
            : m
        )
      );
    };

    // Statut de lecture reçu
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
  const envoyerMessage = async (data, type = "TEXTE", envoyeur, prenom1, prenom2) => {
    let res, result;
    // Si data est un FormData (cas image, audio, etc.)
    if (data instanceof FormData) {
      res = await fetch("/api/messages", {
        method: "POST",
        body: data,
      });
    } else {
      // Sinon, message texte classique
      if (!data.trim()) return null;
      const payload = {
        conversationId,
        contenu: data,
        type,
      };
      if (envoyeur) payload.envoyeur = envoyeur;
      if (prenom1) payload.prenom1 = prenom1;
      if (prenom2) payload.prenom2 = prenom2;

      res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    result = await res.json();

    if (result.success) {
      // Publie sur Ably pour tous les utilisateurs de la conversation
      const channel = ably.channels.get(`conversation-${conversationId}`);
      channel.publish("message", result.message);
      setMessages((prev) => [...prev, result.message]);
      setTexte && setTexte("");
      return result.message;
    }

    return null;
  };

  // Réaction à un message (corrigé)
  const handleReaction = async (messageId, emoji) => {
    const res = await fetch(`/api/messages/${messageId}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });

    const data = await res.json();

    if (data.success) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, reactions: data.reactions }
            : m
        )
      );
      const channel = ably.channels.get(`conversation-${conversationId}`);
      channel.publish("reaction", { messageId, reactions: data.reactions });
    }
  };

  // Gestion des timers : suppression après clic sur message éphémère
  const lancerSuppressionAvecDelai = (messageId) => {
    if (ephemeralTimers.current[messageId]) {
      // Timer déjà lancé, on ne fait rien
      return;
    }
    ephemeralTimers.current[messageId] = setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      delete ephemeralTimers.current[messageId];
    }, 5000);
  };

  // Nettoyage timers au démontage
  useEffect(() => {
    return () => {
      Object.values(ephemeralTimers.current).forEach(clearTimeout);
      ephemeralTimers.current = {};
    };
  }, []);

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
    lancerSuppressionAvecDelai,
  };
}
