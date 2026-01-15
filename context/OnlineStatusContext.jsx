"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getAbly } from "../lib/ably";

const OnlineStatusContext = createContext(null);

export function OnlineStatusProvider({ user, children }) {
  const [counts, setCounts] = useState({});
  const [ready, setReady] = useState(false);

  const enteredRef = useRef(false);
  const cleanedUpRef = useRef(false);
  const channelRef = useRef(null);
  const periodicRef = useRef(null);

  const userId = user?.id ? String(user.id) : null;
  const pseudo = user?.pseudo || null;

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
      const id = m?.data?.userId ?? m?.clientId;
      return id != null ? String(id) : null;
    };

    const syncFromGet = () => {
      channel.presence.get((err, members) => {
        if (err) {
          console.log("[Presence] presence.get error:", err);
          // important: on ne bloque pas l'UI juste parce que get a foiré
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
          "[Presence] GET snapshot ids=",
          Object.keys(next),
          "size=",
          (members || []).length
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

        // tente snapshot après enter
        syncFromGet();
        setTimeout(syncFromGet, 500);
      });
    };

    const ensureEntered = () => {
      if (ably.connection.state === "connected") enterPresence();
    };

    // --- Presence events (et IMPORTANT: on marque ready=true dès qu'on reçoit un event)
    const onEnter = (m) => {
      const id = memberToUserId(m);
      if (!id) return;

      setCounts((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
      setReady(true);
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
      setReady(true);
    };

    const onUpdate = () => {
      setReady(true);
      // resync léger pour corriger les états
      setTimeout(syncFromGet, 120);
    };

    channel.presence.subscribe("enter", onEnter);
    channel.presence.subscribe("leave", onLeave);
    channel.presence.subscribe("update", onUpdate);

    // debug global presence events
    const onAnyPresence = (msg) => {
      const id = msg?.data?.userId ?? msg?.clientId;
      console.log("[Presence] EVENT", msg.action, {
        id: id != null ? String(id) : null,
        clientId: msg.clientId,
        connectionId: msg.connectionId,
        data: msg.data,
      });
    };
    channel.presence.subscribe(onAnyPresence);

    // --- Connection lifecycle
    const onConnState = (stateChange) => {
      console.log(
        "[Presence] conn:",
        stateChange.current,
        stateChange.reason?.message || null
      );
      if (stateChange.current === "connected") {
        enteredRef.current = false;
        ensureEntered();
        setTimeout(syncFromGet, 300);
      }
      if (stateChange.current === "disconnected") {
        enteredRef.current = false;
      }
    };
    ably.connection.on(onConnState);

    // --- Attach channel
    channel.attach((err) => {
      if (err) {
        console.log("[Presence] channel.attach error:", err);
        return;
      }
      console.log("[Presence] channel.attach OK, connState:", ably.connection.state);

      // snapshot + enter
      syncFromGet();
      ensureEntered();
    });

    // periodic resync
    periodicRef.current = setInterval(() => {
      syncFromGet();
      // safety re-enter
      enteredRef.current = false;
      ensureEntered();
    }, 15000);

    // visibility
    const onVis = () => {
      console.log("[Presence] visibility:", document.visibilityState);
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

      console.log("[Presence] CLEANUP userId:", userId);

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
        channel.presence.unsubscribe(onAnyPresence);
      } catch {}

      try {
        ably.connection.off(onConnState);
      } catch {}

      try {
        ably.channels.release("presence:online");
      } catch {}
    };
  }, [userId]); // ⚠️ garde uniquement userId (sinon re-mount)

  // update data sans reset total
  useEffect(() => {
    if (!userId) return;
    const ch = channelRef.current;
    if (!ch) return;
    try {
      ch.presence.update({ userId, pseudo, t: Date.now() });
    } catch {}
  }, [userId, pseudo]);

  const api = useMemo(() => {
    const isOnline = (id) => !!counts[String(id)];
    const onlineCount = (id) => counts[String(id)] || 0;

    // ✅ presenceReady fiable
    const presenceReady = !!ready || Object.keys(counts || {}).length > 0;

    return { isOnline, onlineCount, counts, ready, presenceReady };
  }, [counts, ready]);

  return <OnlineStatusContext.Provider value={api}>{children}</OnlineStatusContext.Provider>;
}

export function useOnlineStatus() {
  const ctx = useContext(OnlineStatusContext);
  if (!ctx) {
    return {
      isOnline: () => false,
      onlineCount: () => 0,
      counts: {},
      ready: false,
      presenceReady: false,
    };
  }
  return ctx;
}
