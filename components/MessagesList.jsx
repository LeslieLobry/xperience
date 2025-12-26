import { useEffect, useRef, useCallback, forwardRef, useMemo, useState } from "react";
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
  },
  ref // ← ref venant du parent (ChatBox)
) {
  // Ref interne pour manipuler le conteneur
  const containerRef = useRef(null);
  const endRef = useRef(null);

  // ✅ throttle load more
  const loadingMoreRef = useRef(false);
  const rafRef = useRef(null);

  // ✅ map presigned urls par key (state local)
  const [resolved, setResolved] = useState(() => new Map()); // key -> url

  // Merge du ref parent et du ref interne
  const setMergedRef = useCallback(
    (node) => {
      containerRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref && "current" in ref) {
        ref.current = node;
      }
    },
    [ref]
  );

  // → Fonction utilitaire pour avoir les prénoms au bon format string
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
     - on prépare avatar + image + audio
     - on stocke dans resolved (et cache global)
     ========================================================= */
  const keysSignature = useMemo(() => {
    // signature stable pour relancer seulement si nécessaire
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

          // si déjà résolu local ou en cache global, inutile de refetch
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

  /* =========================================================
     ✅ On injecte les urls presignées dans les messages
     => MessageBubble ne refetch plus (http direct)
     ========================================================= */
  const enhancedMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];

    return messages.map((m) => {
      if (!m) return m;

      const next = { ...m };

      // avatar auteur
      if (next.auteur && next.auteur.photoUrl) {
        const k = next.auteur.photoUrl;
        const url =
          (typeof k === "string" && k.startsWith("http") ? k : null) ||
          resolved.get(k) ||
          getCached(k);

        if (url) {
          next.auteur = { ...next.auteur, photoUrl: url };
        }
      }

      // image
      if (next.type === "IMAGE" && next.imageUrl) {
        const k = next.imageUrl;
        const url =
          (typeof k === "string" && k.startsWith("http") ? k : null) ||
          resolved.get(k) ||
          getCached(k);

        if (url) next.imageUrl = url;
      }

      // audio
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

  // Lazy loading des anciens messages au scroll haut
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (container.scrollTop < 50 && hasMore) {
        if (loadingMoreRef.current) return;

        // ✅ throttle pour éviter spam
        if (rafRef.current) return;
        rafRef.current = requestAnimationFrame(async () => {
          rafRef.current = null;
          if (loadingMoreRef.current) return;
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

      {/* Ancre finale (au cas où tu en as besoin plus tard) */}
      <div ref={endRef} style={{ height: 1 }} />
      <div style={{ height: 20 }} />
    </div>
  );
});

export default MessagesList;
