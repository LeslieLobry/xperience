// context/OnlineStatusContext.js
"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getAbly } from "../lib/ably";

const OnlineStatusContext = createContext(null);

export function OnlineStatusProvider({ user, children }) {
  const [counts, setCounts] = useState({});
  const [ready, setReady] = useState(false);

  const channelRef = useRef(null);
  const enteredRef = useRef(false);
  const periodicRef = useRef(null);

  const userId = user?.id ? String(user.id) : null;
  const pseudo = user?.pseudo ? String(user.pseudo) : "";

  useEffect(() => {
    if (!userId) return;

    const ably = getAbly();
    if (!ably) return;

    const channel = ably.channels.get("presence:online");
    channelRef.current = channel;

    setCounts({});
    setReady(false);
    enteredRef.current = false;

    const memberToUserId = (m) => {
      const id = m?.data?.userId ?? m?.clientId;
      return id != null ? String(id) : null;
    };

    const syncSnapshot = () => {
      channel.presence.get((err, members) => {
        if (err) {
          console.log("[Presence] presence.get error:", err);
          return;
        }
        const next = {};
        for (const m of members || []) {
          const id = memberToUserId(m);
          if (!id) continue;
          next[id] = (next[id] || 0) + 1;
        }
        setCounts(next);
        setReady(true);

        // debug utile
        // console.log("[Presence] snapshot size:", (members || []).length, next);
      });
    };

    const enterOnce = () => {
      if (enteredRef.current) return;
      if (ably.connection.state !== "connected") return;

      enteredRef.current = true;

      channel.presence.enter({ userId, pseudo, t: Date.now() }, (err) => {
        if (err) {
          console.log("[Presence] enter error:", err);
          enteredRef.current = false;
          return;
        }
        syncSnapshot();
      });
    };

    const onConn = (stateChange) => {
      if (stateChange.current === "connected") {
        enteredRef.current = false;
        enterOnce();
        setTimeout(syncSnapshot, 300);
      }
      if (stateChange.current === "disconnected" || stateChange.current === "suspended") {
        setReady(false);
        enteredRef.current = false;
      }
    };

    const onEnter = (m) => {
      const id = memberToUserId(m);
      if (!id) return;
      setCounts((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    };

    const onLeave = (m) => {
      const id = memberToUserId(m);
      if (!id) return;
      setCounts((prev) => {
        const next = { ...prev };
        const c = (next[id] || 0) - 1;
        if (c <= 0) delete next[id];
        else next[id] = c;
        return next;
      });
    };

    const onUpdate = () => setTimeout(syncSnapshot, 100);

    channel.presence.subscribe("enter", onEnter);
    channel.presence.subscribe("leave", onLeave);
    channel.presence.subscribe("update", onUpdate);

    ably.connection.on(onConn);

    channel.attach((err) => {
      if (err) {
        console.log("[Presence] channel.attach error:", err);
        return;
      }
      syncSnapshot();
      enterOnce();
    });

    // ✅ refresh snapshot (sans re-enter)
    periodicRef.current = setInterval(syncSnapshot, 15000);

    const onVis = () => {
      if (document.visibilityState === "visible") {
        setTimeout(syncSnapshot, 200);
        enteredRef.current = false;
        enterOnce();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      if (periodicRef.current) {
        clearInterval(periodicRef.current);
        periodicRef.current = null;
      }
      document.removeEventListener("visibilitychange", onVis);

      try {
        channel.presence.unsubscribe("enter", onEnter);
        channel.presence.unsubscribe("leave", onLeave);
        channel.presence.unsubscribe("update", onUpdate);
      } catch {}

      try {
        ably.connection.off(onConn);
      } catch {}

      try {
        ably.channels.release("presence:online");
      } catch {}
    };
  }, [userId]); // ✅ uniquement userId

  // ✅ update pseudo sans tout remonter
  useEffect(() => {
    if (!userId) return;
    const ch = channelRef.current;
    if (!ch) return;
    try {
      ch.presence.update({ userId, pseudo, t: Date.now() });
    } catch {}
  }, [userId, pseudo]);

  const api = useMemo(() => {
    const isOnline = (id) => (counts[String(id)] || 0) > 0;
    const onlineCount = (id) => counts[String(id)] || 0;
    return { isOnline, onlineCount, counts, ready };
  }, [counts, ready]);

  return <OnlineStatusContext.Provider value={api}>{children}</OnlineStatusContext.Provider>;
}

export function useOnlineStatus() {
  const ctx = useContext(OnlineStatusContext);
  if (!ctx) return { isOnline: () => false, onlineCount: () => 0, counts: {}, ready: false };
  return ctx;
}
