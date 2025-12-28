import { useEffect, useRef, useCallback, forwardRef, useMemo, useState, useLayoutEffect, useImperativeHandle } from "react";
import MessageBubble from "./ChatBox/MessageBubble";
import { format, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";

/* =========================================================
   ✅ PERF: presign cache + inflight + TTL (global)
   ========================================================= */
const PRESIGN_TTL_MS = 50 * 60 * 1000;
const presignCache = new Map(); // key -> { url, exp }
const presignInflight = new Map(); // key -> Promise

function getCached(key) {
  if (!key) return null;
  const entry = presignCache.get(key);
  if (!entry) return null;
  if (entry.exp > Date.now()) return entry.url;
  presignCache.delete(key);
  return null;
}

function setCached(key, url) {
  if (!key) return;
  presignCache.set(key, { url, exp: Date.now() + PRESIGN_TTL_MS });
}

async function presignKey(key) {
  if (!key) return "/default.jpg";
  if (typeof key === "string" && key.startsWith("http")) return key;

  const cached = getCached(key);
  if (cached) return cached;

  if (presignInflight.has(key)) return presignInflight.get(key);

  const p = fetch("/api/photos/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
    credentials: "include",
    keepalive: true,
  })
    .then((r) => r.json())
    .then((data) => {
      const url = data?.url || `/uploads/${key}`;
      setCached(key, url);
      return url;
    })
    .catch(() => `/uploads/${key}`)
    .finally(() => presignInflight.delete(key));

  presignInflight.set(key, p);
  return p;
}

async function mapWithConcurrency(items, limit, mapper) {
  const ret = new Array(items.length);
  let i = 0;

  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (i < items.length) {
      const idx = i++;
      ret[idx] = await mapper(items[idx], idx);
    }
  });

  await Promise.all(workers);
  return ret;
}

/* =========================================================
   ✅ HELPERS SCROLL
   ========================================================= */
function isNearBottom(el, px = 140) {
  if (!el) return true;
  const dist = el.scrollHeight - (el.scrollTop + el.clientHeight);
  return dist < px;
}

const MessagesList = forwardRef(function MessagesList(
  {
    messages,
    utilisateur,
    onReact,
    typingPseudo,
    lastReads,
    hasMore,
    onLoadMore,
    onDelete,
    prenomsCouple = null,

    // ✅ nouveau: le parent peut dire "j'ouvre une conversation"
    conversationId,
  },
  ref
) {
  const containerRef = useRef(null);
  const endRef = useRef(null);

  // ✅ throttle load more
  const loadingMoreRef = useRef(false);
  const rafRef = useRef(null);

  // ✅ map presigned urls par key (state local)
  const [resolved, setResolved] = useState(() => new Map());

  // ✅ scroll control
  const shouldStickToBottomRef = useRef(true); // si user est en bas, on colle
  const firstRenderForConvRef = useRef(true);
  const lastConvIdRef = useRef(conversationId);

  // ✅ preserve position when prepending
  const pendingPrependAdjustRef = useRef(false);
  const prevScrollHeightRef = useRef(0);
  const prevScrollTopRef = useRef(0);

  // expose des méthodes au parent
  useImperativeHandle(ref, () => ({
    scrollToBottom: (behavior = "auto") => {
      const el = containerRef.current;
      if (!el) return;
      // plus fiable que endRef.scrollIntoView sur iOS
      el.scrollTo({ top: el.scrollHeight, behavior });
    },
    getEl: () => containerRef.current,
  }));

  // track si user est “en bas”
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      shouldStickToBottomRef.current = isNearBottom(el, 180);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // reset "first render" quand conversation change
  useEffect(() => {
    if (lastConvIdRef.current !== conversationId) {
      lastConvIdRef.current = conversationId;
      firstRenderForConvRef.current = true;
      shouldStickToBottomRef.current = true;
    }
  }, [conversationId]);

  // Merge du ref parent et du ref interne
  const setMergedRef = useCallback(
    (node) => {
      containerRef.current = node;
    },
    []
  );

  const getPrenomsCoupleString = (msg) => {
    if (msg.prenom1 && msg.prenom2) return `${msg.prenom1} & ${msg.prenom2}`;
    if (
      msg.prenomsCouple &&
      typeof msg.prenomsCouple === "object" &&
      msg.prenomsCouple.prenom1 &&
      msg.prenomsCouple.prenom2
    ) {
      return `${msg.prenomsCouple.prenom1} & ${msg.prenomsCouple.prenom2}`;
    }
    if (msg.prenomsCouple && typeof msg.prenomsCouple === "string") {
      return msg.prenomsCouple;
    }
    if (
      prenomsCouple &&
      typeof prenomsCouple === "object" &&
      prenomsCouple.prenom1 &&
      prenomsCouple.prenom2
    ) {
      return `${prenomsCouple.prenom1} & ${prenomsCouple.prenom2}`;
    }
    if (prenomsCouple && typeof prenomsCouple === "string") {
      return prenomsCouple;
    }
    return "";
  };

  /* =========================================================
     ✅ PERF: Préfetch presign pour les médias visibles
     ========================================================= */
  const keysSignature = useMemo(() => {
    const parts = [];
    for (const m of messages || []) {
      if (!m) continue;
      if (m.auteur?.photoUrl) parts.push("a:" + m.auteur.photoUrl);
      if (m.type === "IMAGE" && m.imageUrl) parts.push("i:" + m.imageUrl);
      if (m.type === "AUDIO" && m.audioUrl) parts.push("u:" + m.audioUrl);
    }
    return parts.join("|");
  }, [messages]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!messages || messages.length === 0) return;

      const uniqueKeys = [];
      const seen = new Set();

      for (const m of messages) {
        const ak = m?.auteur?.photoUrl;
        const ik = m?.type === "IMAGE" ? m?.imageUrl : null;
        const uk = m?.type === "AUDIO" ? m?.audioUrl : null;

        for (const k of [ak, ik, uk]) {
          if (!k) continue;
          if (typeof k === "string" && k.startsWith("http")) continue;
          if (seen.has(k)) continue;
          seen.add(k);

          if (resolved.get(k) || getCached(k)) continue;
          uniqueKeys.push(k);
        }
      }

      if (!uniqueKeys.length) return;

      const results = await mapWithConcurrency(uniqueKeys, 8, async (k) => {
        const url = await presignKey(k);
        return { k, url };
      });

      if (cancelled) return;

      setResolved((prev) => {
        const next = new Map(prev);
        for (const r of results) {
          if (r?.k && r?.url) next.set(r.k, r.url);
        }
        return next;
      });
    }

    run().catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysSignature]);

  const enhancedMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];
    return messages.map((m) => {
      if (!m) return m;
      const next = { ...m };

      if (next.auteur && next.auteur.photoUrl) {
        const k = next.auteur.photoUrl;
        const url =
          (typeof k === "string" && k.startsWith("http") ? k : null) ||
          resolved.get(k) ||
          getCached(k);
        if (url) next.auteur = { ...next.auteur, photoUrl: url };
      }

      if (next.type === "IMAGE" && next.imageUrl) {
        const k = next.imageUrl;
        const url =
          (typeof k === "string" && k.startsWith("http") ? k : null) ||
          resolved.get(k) ||
          getCached(k);
        if (url) next.imageUrl = url;
      }

      if (next.type === "AUDIO" && next.audioUrl) {
        const k = next.audioUrl;
        const url =
          (typeof k === "string" && k.startsWith("http") ? k : null) ||
          resolved.get(k) ||
          getCached(k);
        if (url) next.audioUrl = url;
      }

      return next;
    });
  }, [messages, resolved]);

  /* =========================================================
     ✅ Lazy loading: on capture la hauteur AVANT de prepend
     ========================================================= */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (container.scrollTop < 50 && hasMore) {
        if (loadingMoreRef.current) return;

        if (rafRef.current) return;
        rafRef.current = requestAnimationFrame(async () => {
          rafRef.current = null;
          if (loadingMoreRef.current) return;

          // ✅ capture AVANT
          prevScrollHeightRef.current = container.scrollHeight;
          prevScrollTopRef.current = container.scrollTop;
          pendingPrependAdjustRef.current = true;

          loadingMoreRef.current = true;
          try {
            await onLoadMore();
          } finally {
            loadingMoreRef.current = false;
          }
        });
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [hasMore, onLoadMore]);

  /* =========================================================
     ✅ Après render: si on a prepend, on restaure la position
     ========================================================= */
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (pendingPrependAdjustRef.current) {
      const prevH = prevScrollHeightRef.current || 0;
      const prevTop = prevScrollTopRef.current || 0;
      const newH = el.scrollHeight || 0;
      const delta = newH - prevH;

      // ✅ on garde exactement la même “ligne” sous le doigt
      el.scrollTop = prevTop + (delta > 0 ? delta : 0);

      pendingPrependAdjustRef.current = false;
      return;
    }
  }, [enhancedMessages.length]);

  /* =========================================================
     ✅ Auto-scroll bottom:
     - 1er render d’une conversation => direct en bas
     - new message => en bas seulement si user était déjà en bas
     ========================================================= */
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (firstRenderForConvRef.current) {
      firstRenderForConvRef.current = false;
      // ✅ force en bas (iOS: useLayoutEffect + scrollTo)
      el.scrollTop = el.scrollHeight;
      return;
    }

    if (shouldStickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [enhancedMessages.length, conversationId]);

  let lastDate = null;

  return (
    <div ref={setMergedRef} className="chat-messages">
      {typingPseudo && (
        <div className="typing-indicator">
          {typingPseudo} est en train d’écrire...
        </div>
      )}

      {enhancedMessages.map((msg, index) => {
        const msgDate = new Date(msg.createdAt);
        let showDate = false;
        if (!lastDate || !isSameDay(msgDate, lastDate)) {
          showDate = true;
          lastDate = msgDate;
        }

        let label = format(msgDate, "dd/MM/yyyy", { locale: fr });
        const now = new Date();
        if (isSameDay(msgDate, now)) label = "Aujourd'hui";
        else {
          const yesterday = new Date();
          yesterday.setDate(now.getDate() - 1);
          if (isSameDay(msgDate, yesterday)) label = "Hier";
        }

        return (
          <div key={msg.id} className="message-class">
            {showDate && (
              <div
                className="day-separator"
                style={{
                  textAlign: "center",
                  margin: "18px 0 8px",
                  color: "#a98e5d",
                  fontWeight: "bold",
                  opacity: 0.7,
                  fontSize: "1.1em",
                }}
              >
                {label}
              </div>
            )}

            <MessageBubble
              msg={msg}
              utilisateur={utilisateur}
              onReact={onReact}
              lastReads={lastReads}
              previousMsg={enhancedMessages[index - 1]}
              onDelete={onDelete}
              prenomsCouple={getPrenomsCoupleString(msg)}
            />
          </div>
        );
      })}

      <div ref={endRef} style={{ height: 1 }} />
      <div style={{ height: 20 }} />
    </div>
  );
});

export default MessagesList;
