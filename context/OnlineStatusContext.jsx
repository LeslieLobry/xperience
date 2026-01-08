"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import Ably from "ably";

const OnlineStatusContext = createContext(null);

export function OnlineStatusProvider({ user, children }) {
  const [counts, setCounts] = useState({});
  const [ready, setReady] = useState(false); // ✅ on a une snapshot fiable après un presence.get()
  const enteredRef = useRef(false);
  const cleanedUpRef = useRef(false);

  useEffect(() => {
    if (!user?.id) return;

    console.log("[Presence] init for user:", user.id);

    cleanedUpRef.current = false;
    enteredRef.current = false;
    setCounts({});
    setReady(false);

    const ably = new Ably.Realtime({
      authUrl: "/api/presence/token",
      authMethod: "GET",
      echoMessages: false,
      closeOnUnload: false,
      clientId: String(user.id),
    });

    const channel = ably.channels.get("presence:online");

    const memberToUserId = (m) => {
      const id = m?.clientId;
      if (!id) return null;
      return String(id);
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
        setReady(true); // ✅ on a une base fiable (online/offline)
      });
    };

    const enterPresence = () => {
      if (enteredRef.current) return;
      enteredRef.current = true;

      console.log("[Presence] entering…");

      channel.presence.enter({ pseudo: user.pseudo || "", t: Date.now() }, (err) => {
        console.log("[Presence] enter callback err?:", err || null);
        if (err) {
          enteredRef.current = false;
          return;
        }
        syncFromGet();
        setTimeout(syncFromGet, 500);
      });
    };

    const onConnectionState = (stateChange) => {
      const state = stateChange?.current || stateChange;
      console.log("[Presence] Ably state:", state);

      if (state === "connected") {
        enteredRef.current = false; // ✅ autorise re-enter
        enterPresence();
        setTimeout(syncFromGet, 500);
      }
    };

    ably.connection.on(onConnectionState);

    // kick initial
    setTimeout(() => {
      enterPresence();
      syncFromGet();
    }, 0);

    const onEnter = (m) => {
      const id = memberToUserId(m);
      console.log("[Presence] enter event:", m?.clientId, m?.data || null);
      if (id != null) addOne(id);
    };

    const onLeave = (m) => {
      const id = memberToUserId(m);
      console.log("[Presence] leave event:", m?.clientId);
      if (id != null) removeOne(id);
    };

    channel.presence.subscribe("enter", onEnter);
    channel.presence.subscribe("leave", onLeave);

    const periodicSync = setInterval(syncFromGet, 15000);

    const cleanup = () => {
      if (cleanedUpRef.current) return;
      cleanedUpRef.current = true;

      console.log("[Presence] cleanup…");
      clearInterval(periodicSync);

      try {
        channel.presence.unsubscribe("enter", onEnter);
        channel.presence.unsubscribe("leave", onLeave);
      } catch {}

      try {
        channel.presence.leave(() => {});
      } catch {}

      try {
        ably.connection.off(onConnectionState);
      } catch {}

      try {
        ably.channels.release("presence:online");
      } catch {}

      try {
        ably.close();
      } catch {}
    };

    window.addEventListener("beforeunload", cleanup);

    const onVis = () => {
      if (document.visibilityState === "visible") {
        setTimeout(syncFromGet, 200);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener("beforeunload", cleanup);
      document.removeEventListener("visibilitychange", onVis);
      cleanup();
    };
  }, [user?.id, user?.pseudo]);

  const api = useMemo(() => {
    // ✅ IMPORTANT : toujours booléen
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
