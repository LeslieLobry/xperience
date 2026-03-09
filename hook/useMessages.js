import { useEffect, useCallback, useRef } from "react";
import useSWR from "swr";
import { Realtime } from "ably";

/* -------------------------------------------------------------------------- */
/* ✅ Ably singleton (authUrl si dispo, fallback clé publique)                */
/* -------------------------------------------------------------------------- */
let ablyClient = null;

function getAbly() {
  if (ablyClient) return ablyClient;

  try {
    ablyClient = new Realtime({
      authUrl: "/api/ably-token",
      authMethod: "GET",
      echoMessages: false,
      closeOnUnload: false,
    });
    return ablyClient;
  } catch (_) {}

  const key = process.env.NEXT_PUBLIC_ABLY_API_KEY;
  if (!key) return null;

  ablyClient = new Realtime(key);
  return ablyClient;
}

const MESSAGES_LIMIT = 30;

const fetcher = async (url) => {
  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Erreur ${res.status}`);
  }

  return res.json();
};

export function useMessages(conversationId, utilisateur, setTexte) {
  /* ---------------------------------------------------------------------- */
  /* 1) SWR                                                                  */
  /* ---------------------------------------------------------------------- */
  const { data, error, isLoading, mutate } = useSWR(
    conversationId
      ? `/api/messages?conversationId=${conversationId}&limit=${MESSAGES_LIMIT}`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5000,
      fallbackData: {
        messages: [],
        participants: [],
        hasMore: false,
        lastReads: [],
      },
    }
  );

  const messages = data?.messages || [];
  const participantsAutres = (data?.participants || []).filter(
    (u) => u.id !== utilisateur.id
  );
  const hasMore = data?.hasMore ?? false;
  const lastReads = data?.lastReads || [];

  /* ---------------------------------------------------------------------- */
  /* 2) Refs                                                                 */
  /* ---------------------------------------------------------------------- */
  const ephemeralTimers = useRef({});
  const loadingMoreRef = useRef(false);

  const lastIncomingIdRef = useRef(null);
  const markReadTimerRef = useRef(null);
  const readRefetchTimerRef = useRef(null);

  /* ---------------------------------------------------------------------- */
  /* Helpers: ACK + READ                                                     */
  /* ---------------------------------------------------------------------- */
  const postJSON = (url, body) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});

  const acknowledge = (messageId) => {
    if (!messageId) return;
    postJSON("/api/messages/acknowledge", { messageId });
  };

  const scheduleMarkAsRead = (messageId) => {
    if (!messageId) return;
    lastIncomingIdRef.current = messageId;

    if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current);

    markReadTimerRef.current = setTimeout(() => {
      const lastId = lastIncomingIdRef.current;
      if (!lastId) return;
      postJSON("/api/messages/mark-as-read", { messageId: lastId });
    }, 600);
  };

  /* ---------------------------------------------------------------------- */
  /* 3) Ably subscription                                                    */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    if (!conversationId || !utilisateur?.id) return;

    const client = getAbly();
    if (!client) return;

    const channel = client.channels.get(`conversation-${conversationId}`);

    const onMessage = (msg) => {
      const newMsg = msg.data;
      if (!newMsg) return;

      if (newMsg.auteurId !== utilisateur.id) {
        acknowledge(newMsg.id);
        scheduleMarkAsRead(newMsg.id);
      }

      mutate(
        (current) => {
          if (!current) return current;

          const currentMessages = Array.isArray(current.messages)
            ? current.messages
            : [];

          if (currentMessages.some((m) => m.id === newMsg.id)) {
            return current;
          }

          if (newMsg.optimisticKey) {
            const idx = currentMessages.findIndex(
              (m) =>
                m?.optimisticKey &&
                m.optimisticKey === newMsg.optimisticKey &&
                m.statut === "pending"
            );

            if (idx !== -1) {
              const updated = [...currentMessages];
              updated[idx] = { ...newMsg, statut: "sent" };
              return { ...current, messages: updated };
            }
          }

          const pendingIndex = currentMessages.findIndex((m) => {
            if (m.statut !== "pending") return false;
            if (m.auteurId !== newMsg.auteurId) return false;
            if (m.type !== newMsg.type) return false;

            if (m.type === "IMAGE") return m.contenu === "[Image]";
            if (m.type === "AUDIO") return m.contenu === "[Audio]";
            return m.contenu === newMsg.contenu;
          });

          if (pendingIndex !== -1) {
            const updated = [...currentMessages];
            updated[pendingIndex] = { ...newMsg, statut: "sent" };
            return { ...current, messages: updated };
          }

          return {
            ...current,
            messages: [...currentMessages, newMsg],
          };
        },
        false
      );
    };

    const onReaction = (msg) => {
      const { messageId, reactions } = msg.data || {};
      if (!messageId) return;

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

    const onRead = (msg) => {
      const data = msg?.data || {};
      const messageId = data.messageId;

      if (!messageId) return;
      if (readRefetchTimerRef.current) return;

      readRefetchTimerRef.current = setTimeout(() => {
        mutate(
          (current) => {
            if (!current?.messages) return current;

            return {
              ...current,
              messages: current.messages.map((m) =>
                m.id === messageId ? { ...m, lu: true } : m
              ),
            };
          },
          false
        );

        readRefetchTimerRef.current = null;
      }, 250);
    };

    channel.subscribe("message", onMessage);
    channel.subscribe("reaction", onReaction);
    channel.subscribe("read", onRead);

    return () => {
      channel.unsubscribe("message", onMessage);
      channel.unsubscribe("reaction", onReaction);
      channel.unsubscribe("read", onRead);

      if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current);
      if (readRefetchTimerRef.current) clearTimeout(readRefetchTimerRef.current);
    };
  }, [conversationId, utilisateur?.id, mutate]);

  /* ---------------------------------------------------------------------- */
  /* 4) Lazy loading anciens messages                                        */
  /* ---------------------------------------------------------------------- */
  const loadMoreMessages = useCallback(async () => {
    if (!conversationId || !hasMore || messages.length === 0) return;
    if (loadingMoreRef.current) return;

    loadingMoreRef.current = true;

    try {
      const oldestMessageId = messages[0]?.id;
      if (!oldestMessageId) return;

      const res = await fetch(
        `/api/messages?conversationId=${conversationId}&beforeId=${oldestMessageId}&limit=${MESSAGES_LIMIT}`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      if (!res.ok) {
        throw new Error(`Erreur ${res.status}`);
      }

      const more = await res.json();

      if (more.success && Array.isArray(more.messages)) {
        mutate(
          (current) => {
            if (!current) return current;

            const existingIds = new Set(
              (current.messages || []).map((m) => m.id)
            );

            const cleanedMore = more.messages.filter(
              (m) => !existingIds.has(m.id)
            );

            return {
              ...current,
              messages: [...cleanedMore, ...(current.messages || [])],
              hasMore: more.hasMore ?? false,
            };
          },
          false
        );
      }
    } catch (e) {
      console.error("Erreur loadMoreMessages :", e);
    } finally {
      loadingMoreRef.current = false;
    }
  }, [conversationId, messages, hasMore, mutate]);

  /* ---------------------------------------------------------------------- */
  /* 5) Envoi message                                                        */
  /* ---------------------------------------------------------------------- */
  const envoyerMessage = async (
    dataToSend,
    type = "TEXTE",
    envoyeur,
    prenom1,
    prenom2
  ) => {
    let res;
    let result;

    const isForm = dataToSend instanceof FormData;

    if (isForm) {
      res = await fetch("/api/messages", {
        method: "POST",
        body: dataToSend,
        credentials: "include",
      });
    } else {
      let payloadData = dataToSend;

      if (typeof payloadData === "string") {
        if (!payloadData.trim()) return null;
        payloadData = { contenu: payloadData, type };
      }

      if (!payloadData?.contenu || !payloadData.contenu.trim()) return null;

      const payload = {
        conversationId,
        ...payloadData,
      };

      res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
    }

    result = await res.json();

    if (result.success) {
      if (!isForm && setTexte) setTexte("");
      return result.message;
    }

    return null;
  };

  /* ---------------------------------------------------------------------- */
  /* 6) Réaction                                                             */
  /* ---------------------------------------------------------------------- */
  const handleReaction = async (messageId, emoji) => {
    mutate(
      (current) => {
        if (!current?.messages) return current;

        return {
          ...current,
          messages: current.messages.map((m) => {
            if (m.id !== messageId) return m;

            const rx = Array.isArray(m.reactions) ? [...m.reactions] : [];
            const idx = rx.findIndex(
              (r) => r?.emoji === emoji && r?.utilisateurId === utilisateur.id
            );

            if (idx >= 0) rx.splice(idx, 1);
            else rx.push({ emoji, utilisateurId: utilisateur.id });

            return { ...m, reactions: rx };
          }),
        };
      },
      false
    );

    const res = await fetch(`/api/messages/${messageId}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
      credentials: "include",
    });

    const dataRes = await res.json();

    if (dataRes.success) {
      mutate(
        (current) => {
          if (!current?.messages) return current;

          return {
            ...current,
            messages: current.messages.map((m) =>
              m.id === messageId ? { ...m, reactions: dataRes.reactions } : m
            ),
          };
        },
        false
      );

      const client = getAbly();
      if (client) {
        const channel = client.channels.get(`conversation-${conversationId}`);
        channel.publish("reaction", {
          messageId,
          reactions: dataRes.reactions,
        });
      }

      return;
    }

    mutate();
  };

  /* ---------------------------------------------------------------------- */
  /* 7) Timers éphémères                                                     */
  /* ---------------------------------------------------------------------- */
  const lancerSuppressionAvecDelai = (messageId) => {
    if (ephemeralTimers.current[messageId]) return;

    ephemeralTimers.current[messageId] = setTimeout(() => {
      delete ephemeralTimers.current[messageId];
    }, 5000);
  };

  useEffect(() => {
    return () => {
      Object.values(ephemeralTimers.current).forEach(clearTimeout);
      ephemeralTimers.current = {};

      if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current);
      if (readRefetchTimerRef.current) clearTimeout(readRefetchTimerRef.current);
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