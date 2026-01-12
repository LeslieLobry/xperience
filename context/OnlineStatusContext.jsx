"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ably } from "../lib/ably";

const OnlineStatusContext = createContext(null);

export function OnlineStatusProvider({ user, children }) {
  const [counts, setCounts] = useState({});
  const [ready, setReady] = useState(false);

  const enteredRef = useRef(false);
  const cleanedUpRef = useRef(false);

  useEffect(() => {
    if (!user?.id) return;
    if (!ably) return;

    cleanedUpRef.current = false;
    enteredRef.current = false;
    setCounts({});
    setReady(false);

    const channel = ably.channels.get("presence:online");

    const memberToUserId = (m) => {
      const id = m?.clientId;
      return id ? String(id) : null;
    };

    const addOne = (id) => {
      const key = String(id);
      setCounts((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
    };

    const removeOne = (id) => {
      const key = String(id);
      setCounts((prev) => {
        const next = { ...prev };
        const c = (next[key] || 0) - 1;
        if (c <= 0) delete next[key];
        else next[key] = c;
        return next;
      });
    };

    const syncFromGet = () => {
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
      });
    };

    const enterPresence = () => {
      if (enteredRef.current) return;
      enteredRef.current = true;

      channel.presence.enter(
        { pseudo: user.pseudo || "", t: Date.now() },
        (err) => {
          if (err) {
            console.log("[Presence] enter error:", err);
            enteredRef.current = false;
            return;
          }
          syncFromGet();
          setTimeout(syncFromGet, 500);
        }
      );
    };

    const onConnected = () => {
      enteredRef.current = false;
      enterPresence();
      setTimeout(syncFromGet, 300);
    };

    const onEnter = (m) => {
      const id = memberToUserId(m);
      if (id != null) addOne(id);
    };

    const onLeave = (m) => {
      const id = memberToUserId(m);
      if (id != null) removeOne(id);
    };

    channel.presence.subscribe("enter", onEnter);
    channel.presence.subscribe("leave", onLeave);

    ably.connection.on("connected", onConnected);

    // ✅ attach avant snapshot
    channel.attach((err) => {
      if (err) console.log("[Presence] channel.attach error:", err);
      // kick initial
      if (ably.connection.state === "connected") onConnected();
      else syncFromGet();
    });

    const periodicSync = setInterval(syncFromGet, 15000);

    const onVis = () => {
      if (document.visibilityState === "visible") {
        setTimeout(syncFromGet, 200);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      if (cleanedUpRef.current) return;
      cleanedUpRef.current = true;

      clearInterval(periodicSync);
      document.removeEventListener("visibilitychange", onVis);

      try {
        channel.presence.unsubscribe("enter", onEnter);
        channel.presence.unsubscribe("leave", onLeave);
      } catch {}

      try {
        ably.connection.off("connected", onConnected);
      } catch {}

      // ✅ pas de leave ici : évite le clignotement sur remount/navigation
      // Ably + closeOnUnload gère la sortie réelle
    };
  }, [user?.id]); // ✅ IMPORTANT

  const api = useMemo(() => {
    const isOnline = (userId) => !!counts[String(userId)];
    const onlineCount = (userId) => counts[String(userId)] || 0;
    return { isOnline, onlineCount, counts, ready };
  }, [counts, ready]);

  return <OnlineStatusContext.Provider value={api}>{children}</OnlineStatusContext.Provider>;
}

export function useOnlineStatus() {
  const ctx = useContext(OnlineStatusContext);
  if (!ctx) return { isOnline: () => false, onlineCount: () => 0, counts: {}, ready: false };
  return ctx;
}
