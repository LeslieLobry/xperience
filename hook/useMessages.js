import { useEffect, useCallback, useRef } from "react";
import useSWR from "swr";
import { Realtime } from "ably";

const ably = new Realtime(process.env.NEXT_PUBLIC_ABLY_API_KEY);

const MESSAGES_LIMIT = 30;
const fetcher = (url) => fetch(url).then((res) => res.json());

export function useMessages(conversationId, utilisateur, setTexte) {
  // 1. SWR pour messages/participants
  const { data, error, isLoading, mutate } = useSWR(
    conversationId
      ? `/api/messages?conversationId=${conversationId}&limit=${MESSAGES_LIMIT}`
      : null,
    fetcher,
    {
      // ⚡ évite des refetch partout dès que tu changes d’onglet / réseau
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5000,
    }
  );

  const messages = data?.messages || [];
  const participantsAutres = (data?.participants || []).filter(
    (u) => u.id !== utilisateur.id
  );
  const hasMore = data?.hasMore ?? false; // ✅ basé sur l’API, pas sur la longueur
  const lastReads = data?.lastReads || [];

  // Référence pour timers d'effacement messages éphémères
  const ephemeralTimers = useRef({});
  // Pour éviter plusieurs loadMore en même temps
  const loadingMoreRef = useRef(false);

  // 2. Abonnement temps réel Ably pour cette conversation
  useEffect(() => {
    if (!conversationId) return;
    const channel = ably.channels.get(`conversation-${conversationId}`);

    const onMessage = (msg) => {
      const newMsg = msg.data;
      if (!newMsg) return;

      // ACK + LU uniquement si ce n'est pas moi
      if (newMsg.auteurId !== utilisateur.id) {
        fetch("/api/messages/acknowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId: newMsg.id }),
        });
        fetch("/api/messages/mark-as-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId: newMsg.id }),
        });
      }

      // ⚡ mise à jour locale sans refetch global
      mutate(
        (current) => {
          if (!current) return current;
          const exists = (current.messages || []).some(
            (m) => m.id === newMsg.id
          );
          if (exists) return current;
          return {
            ...current,
            messages: [...(current.messages || []), newMsg],
          };
        },
        false // pas de revalidate réseau
      );
    };

    const onReaction = (msg) => {
      const { messageId, reactions } = msg.data || {};
      if (!messageId) {
        mutate();
        return;
      }
      // ⚡ on patch juste les réactions localement
      mutate(
        (current) => {
          if (!current?.messages) return current;
          return {
            ...current,
            messages: current.messages.map((m) =>
              m.id === messageId ? { ...m, reactions } : m
            ),
          };
        },
        false
      );
    };

    const onRead = () => {
      // les "read" sont moins fréquents, on peut se permettre un petit refetch
      mutate();
    };

    channel.subscribe("message", onMessage);
    channel.subscribe("reaction", onReaction);
    channel.subscribe("read", onRead);

    return () => {
      channel.unsubscribe("message", onMessage);
      channel.unsubscribe("reaction", onReaction);
      channel.unsubscribe("read", onRead);
    };
  }, [conversationId, utilisateur.id, mutate]);

  // 3. Chargement des anciens messages (lazy loading)
  const loadMoreMessages = useCallback(async () => {
    if (!conversationId || !hasMore || messages.length === 0) return;
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;

    try {
      const oldestMessageId = messages[0]?.id;
      const res = await fetch(
        `/api/messages?conversationId=${conversationId}&beforeId=${oldestMessageId}&limit=${MESSAGES_LIMIT}`
      );
      const more = await res.json();

      if (more.success && Array.isArray(more.messages)) {
        mutate(
          (current) => {
            if (!current) return current;
            return {
              ...current,
              // anciens + actuels
              messages: [...more.messages, ...(current.messages || [])],
              hasMore: more.hasMore ?? false,
            };
          },
          false
        );
      }
    } finally {
      loadingMoreRef.current = false;
    }
  }, [conversationId, messages, hasMore, mutate]);

  // 4. Envoi d'un message
  const envoyerMessage = async (
    dataToSend,
    type = "TEXTE",
    envoyeur,
    prenom1,
    prenom2
  ) => {
    let res;
    let result;

    if (dataToSend instanceof FormData) {
      res = await fetch("/api/messages", {
        method: "POST",
        body: dataToSend,
      });
    } else {
      let payloadData = dataToSend;
      if (typeof payloadData === "string") {
        if (!payloadData.trim()) return null;
        payloadData = { contenu: payloadData, type };
      }
      if (!payloadData.contenu || !payloadData.contenu.trim()) return null;

      const payload = {
        conversationId,
        ...payloadData,
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
      // ⚠️ on ne fait plus de mutate() ici : c’est ChatBox qui décide de resync
      return result.message;
    }
    return null;
  };

  // 5. Réaction à un message
  const handleReaction = async (messageId, emoji) => {
    const res = await fetch(`/api/messages/${messageId}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    const dataRes = await res.json();
    if (dataRes.success) {
      const channel = ably.channels.get(`conversation-${conversationId}`);
      channel.publish("reaction", {
        messageId,
        reactions: dataRes.reactions,
      });
      // pas besoin de mutate ici, on se met à jour via l’event Ably "reaction"
    }
  };

  // 6. Gestion des timers (éphémères)
  const lancerSuppressionAvecDelai = (messageId) => {
    if (ephemeralTimers.current[messageId]) {
      return;
    }
    ephemeralTimers.current[messageId] = setTimeout(() => {
      delete ephemeralTimers.current[messageId];
      // côté serveur ça supprime, et via Ably / mutate global tu seras sync
    }, 5000);
  };

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
    mutate,
    isLoading,
    error,
  };
}
