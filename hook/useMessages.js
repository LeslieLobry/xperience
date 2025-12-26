import { useEffect, useCallback, useRef } from "react";
import useSWR from "swr";
import { Realtime } from "ably";

/* -------------------------------------------------------------------------- */
/* ✅ Ably singleton (authUrl si dispo, fallback clé publique)                */
/* -------------------------------------------------------------------------- */
let ablyClient = null;
function getAbly() {
  if (ablyClient) return ablyClient;

  // ✅ si tu as /api/ably/token : plus stable en prod
  try {
    ablyClient = new Realtime({
      authUrl: "/api/ably/token",
      authMethod: "GET",
      echoMessages: false,
      closeOnUnload: false,
    });
    return ablyClient;
  } catch (_) {}

  // fallback clé publique
  const key = process.env.NEXT_PUBLIC_ABLY_API_KEY;
  if (!key) return null;
  ablyClient = new Realtime(key);
  return ablyClient;
}

const MESSAGES_LIMIT = 30;
const fetcher = (url) => fetch(url, { credentials: "include" }).then((res) => res.json());

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

  // ✅ batch read (évite 1 request/message)
  const lastIncomingIdRef = useRef(null);
  const markReadTimerRef = useRef(null);

  // ✅ throttle refetch on "read"
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

  // ✅ READ groupé: on envoie le dernier id reçu après 600ms sans nouveau msg
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
    if (!conversationId) return;

    const client = getAbly();
    if (!client) return;

    const channel = client.channels.get(`conversation-${conversationId}`);

    const onMessage = (msg) => {
      const newMsg = msg.data;
      if (!newMsg) return;

      // ✅ ACK + READ uniquement si ce n'est pas moi
      if (newMsg.auteurId !== utilisateur.id) {
        acknowledge(newMsg.id);
        scheduleMarkAsRead(newMsg.id);
      }

      // ✅ patch local sans refetch global
      mutate(
        (current) => {
          if (!current) return current;
          const currentMessages = current.messages || [];

          // 1) déjà présent
          if (currentMessages.some((m) => m.id === newMsg.id)) return current;

          // 2) remplacement du message optimiste pending
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

          // 3) append normal
          return { ...current, messages: [...currentMessages, newMsg] };
        },
        false
      );
    };

    const onReaction = (msg) => {
      const { messageId, reactions } = msg.data || {};
      if (!messageId) {
        // garde ton comportement : si donnée invalide => refetch
        mutate();
        return;
      }
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
      // 🔥 Avant: mutate() direct => refetch souvent
      // ✅ Maintenant: throttle léger
      if (readRefetchTimerRef.current) return;
      readRefetchTimerRef.current = setTimeout(() => {
        mutate();
        readRefetchTimerRef.current = null;
      }, 600);
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
  }, [conversationId, utilisateur.id, mutate]);

  /* ---------------------------------------------------------------------- */
  /* 4) Lazy loading anciens messages                                         */
  /* ---------------------------------------------------------------------- */
  const loadMoreMessages = useCallback(async () => {
    if (!conversationId || !hasMore || messages.length === 0) return;
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;

    try {
      const oldestMessageId = messages[0]?.id;
      const res = await fetch(
        `/api/messages?conversationId=${conversationId}&beforeId=${oldestMessageId}&limit=${MESSAGES_LIMIT}`,
        { credentials: "include" }
      );
      const more = await res.json();

      if (more.success && Array.isArray(more.messages)) {
        mutate(
          (current) => {
            if (!current) return current;

            // ✅ évite doublons (si Ably arrive en même temps)
            const existingIds = new Set((current.messages || []).map((m) => m.id));
            const cleanedMore = more.messages.filter((m) => !existingIds.has(m.id));

            return {
              ...current,
              messages: [...cleanedMore, ...(current.messages || [])],
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

  /* ---------------------------------------------------------------------- */
  /* 5) Envoi message                                                         */
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

    if (dataToSend instanceof FormData) {
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
      if (!payloadData.contenu || !payloadData.contenu.trim()) return null;

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
      setTexte && setTexte("");
      // ✅ garde ton choix : pas de mutate ici (Ably gère)
      return result.message;
    }
    return null;
  };

  /* ---------------------------------------------------------------------- */
/* 6) Réaction                                                              */
/* ---------------------------------------------------------------------- */
const handleReaction = async (messageId, emoji) => {
  // ✅ Optimistic : toggle local immédiat (sans attendre Ably)
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

  // ✅ API
  const res = await fetch(`/api/messages/${messageId}/react`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emoji }),
    credentials: "include",
  });

  const dataRes = await res.json();

  if (dataRes.success) {
    // ✅ On remplace par la vérité serveur (liste finale)
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

    // ✅ On broadcast aux autres via Ably
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

  // ❌ si échec: rollback (on revalidate pour être safe)
  mutate();
};

  /* ---------------------------------------------------------------------- */
  /* 7) Timers éphémères                                                      */
  /* ---------------------------------------------------------------------- */
  const lancerSuppressionAvecDelai = (messageId) => {
    if (ephemeralTimers.current[messageId]) return;

    ephemeralTimers.current[messageId] = setTimeout(() => {
      delete ephemeralTimers.current[messageId];
      // côté serveur supprime, Ably/refresh te resync
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
