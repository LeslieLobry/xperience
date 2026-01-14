"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getAbly } from "../lib/ably";

const OnlineStatusContext = createContext(null);

function asId(v) {
  if (v === null || v === undefined) return null;
  return String(v);
}

export function OnlineStatusProvider({ user, children }) {
  const [counts, setCounts] = useState({});
  const [ready, setReady] = useState(false);

  const enteredRef = useRef(false);
  const cleanedUpRef = useRef(false);
  const channelRef = useRef(null);
  const periodicRef = useRef(null);

  const userId = user?.id ? asId(user.id) : null;
  const pseudo = user?.pseudo ? String(user.pseudo) : null;

  useEffect(() => {
    if (!userId) return;

    const ably = getAbly();
    if (!ably) return;

    cleanedUpRef.current = false;
    enteredRef.current = false;

    setCounts({});
    setReady(false);

    const channel = ably.channels.get("presence:online");
    channelRef.current = channel;

    const memberToUserId = (m) => {
      // on privilégie data.userId si présent
      const id = m?.data?.userId ?? m?.clientId;
      return asId(id);
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

        console.log(
          "[Presence] GET snapshot size:",
          (members || []).length,
          "keys:",
          Object.keys(next)
        );
      });
    };

    const enterPresence = () => {
      if (enteredRef.current) return;
      enteredRef.current = true;

      console.log("[Presence] ENTER start", {
        userId,
        pseudo,
        connState: ably.connection.state,
        ablyClientId: ably.auth?.clientId || null,
      });

      channel.presence.enter({ userId, pseudo, t: Date.now() }, (err) => {
        console.log("[Presence] ENTER cb", err || "OK", { userId });

        if (err) {
          enteredRef.current = false;
          return;
        }

        syncFromGet();
        setTimeout(syncFromGet, 400);
      });
    };

    const ensureEntered = () => {
      if (ably.connection.state === "connected") enterPresence();
    };

    // events
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

    const onUpdate = () => setTimeout(syncFromGet, 100);

    channel.presence.subscribe("enter", onEnter);
    channel.presence.subscribe("leave", onLeave);
    channel.presence.subscribe("update", onUpdate);

    // connection lifecycle
    const onConn = (stateChange) => {
      if (stateChange.current === "connected") {
        enteredRef.current = false; // autorise re-enter après reconnexion
        ensureEntered();
        setTimeout(syncFromGet, 250);
      }
      if (stateChange.current === "disconnected") {
        enteredRef.current = false;
        setReady(false);
      }
    };
    ably.connection.on(onConn);

    // attach
    channel.attach((err) => {
      if (err) {
        console.log("[Presence] channel.attach error:", err);
        return;
      }
      console.log("[Presence] channel ATTACHED. connState:", ably.connection.state);

      syncFromGet();
      ensureEntered();
    });

    periodicRef.current = setInterval(() => {
      syncFromGet();
      // sécurité : si presence perdue, on retente
      enteredRef.current = false;
      ensureEntered();
    }, 15000);

    const onVis = () => {
      if (document.visibilityState === "visible") {
        setTimeout(syncFromGet, 200);
        enteredRef.current = false;
        ensureEntered();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      if (cleanedUpRef.current) return;
      cleanedUpRef.current = true;

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
  }, [userId]); // ✅ seulement userId (sinon tu re-mount tout le système)

  // update pseudo sans tout remonter
  useEffect(() => {
    if (!userId) return;
    const ch = channelRef.current;
    if (!ch) return;
    try {
      ch.presence.update({ userId, pseudo, t: Date.now() });
    } catch {}
  }, [userId, pseudo]);

  const api = useMemo(() => {
    const isOnline = (id) => !!counts[asId(id)];
    const onlineCount = (id) => counts[asId(id)] || 0;
    return { isOnline, onlineCount, counts, ready };
  }, [counts, ready]);

  return <OnlineStatusContext.Provider value={api}>{children}</OnlineStatusContext.Provider>;
}

export function useOnlineStatus() {
  const ctx = useContext(OnlineStatusContext);
  if (!ctx) return { isOnline: () => false, onlineCount: () => 0, counts: {}, ready: false };
  return ctx;
}
