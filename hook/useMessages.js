import { useEffect, useCallback, useRef } from "react";
import useSWR from "swr";
import { Realtime } from "ably";

const ably = new Realtime(process.env.NEXT_PUBLIC_ABLY_API_KEY);

const MESSAGES_LIMIT = 30;
const fetcher = (url) => fetch(url).then(res => res.json());

export function useMessages(conversationId, utilisateur, setTexte) {
  // 1. SWR pour messages/participants
  const { data, error, isLoading, mutate } = useSWR(
    conversationId ? `/api/messages?conversationId=${conversationId}&limit=${MESSAGES_LIMIT}` : null,
    fetcher
  );

  const messages = data?.messages || [];
  const participantsAutres = (data?.participants || []).filter(u => u.id !== utilisateur.id);
  const hasMore = messages.length === MESSAGES_LIMIT;
  const lastReads = data?.lastReads || [];

  // Référence pour timers d'effacement messages éphémères
  const ephemeralTimers = useRef({});

  // Abonnement temps réel Ably pour cette conversation
  useEffect(() => {
    if (!conversationId) return;
    const channel = ably.channels.get(`conversation-${conversationId}`);

    const onMessage = (msg) => {
      // Cas "optimistic update"
      mutate(); // On refetch pour être synchro (sinon tu peux faire update local si tu veux)
      // ACK et LU (inchangé)
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
    };

    const onReaction = () => { mutate(); };
    const onRead = () => { mutate(); };

    channel.subscribe("message", onMessage);
    channel.subscribe("reaction", onReaction);
    channel.subscribe("read", onRead);

    return () => {
      channel.unsubscribe("message", onMessage);
      channel.unsubscribe("reaction", onReaction);
      channel.unsubscribe("read", onRead);
    };
  }, [conversationId, utilisateur.id, mutate]);

  // Chargement des anciens messages (lazy loading)
  const loadMoreMessages = useCallback(async () => {
    if (!conversationId || !hasMore || messages.length === 0) return;
    const oldestMessageId = messages[0]?.id;
    const res = await fetch(
      `/api/messages?conversationId=${conversationId}&beforeId=${oldestMessageId}&limit=${MESSAGES_LIMIT}`
    );
    const data = await res.json();
    if (data.success && data.messages) {
      // Concatène anciens + actuels (patch temporaire pour l'exemple, à adapter à ton UI)
      mutate({
        ...data,
        messages: [...data.messages, ...messages],
      }, false); // false = pas de refetch auto
    }
  }, [conversationId, messages, hasMore, mutate]);

  // Envoi d'un message
  const envoyerMessage = async (data, type = "TEXTE", envoyeur, prenom1, prenom2) => {
    let res, result;
    if (data instanceof FormData) {
      res = await fetch("/api/messages", { method: "POST", body: data });
    } else {
      if (typeof data === "string") {
        if (!data.trim()) return null;
        data = { contenu: data, type };
      }
      if (!data.contenu || !data.contenu.trim()) return null;
      const payload = {
        conversationId,
        ...data,
      };
      res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    result = await res.json();

    if (result.success) {
      setTexte && setTexte("");
      mutate(); // Refetch après envoi pour synchro
      return result.message;
    }
    return null;
  };

  // Réaction à un message
  const handleReaction = async (messageId, emoji) => {
    const res = await fetch(`/api/messages/${messageId}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    const data = await res.json();
    if (data.success) {
      mutate();
      const channel = ably.channels.get(`conversation-${conversationId}`);
      channel.publish("reaction", { messageId, reactions: data.reactions });
    }
  };

  // Gestion des timers : suppression après clic sur message éphémère
  const lancerSuppressionAvecDelai = (messageId) => {
    if (ephemeralTimers.current[messageId]) {
      return;
    }
    ephemeralTimers.current[messageId] = setTimeout(() => {
      // Ce sera auto mis à jour via mutate/Ably côté serveur
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
    participantsAutres,
    envoyerMessage,
    handleReaction,
    hasMore,
    loadMoreMessages,
    lastReads,
    lancerSuppressionAvecDelai,
    mutate, // Pour rafraîchir si besoin
    isLoading,
    error,
  };
}
