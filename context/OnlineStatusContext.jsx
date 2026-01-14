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

  // debug
  const [debug, setDebug] = useState({
    channelState: "init",
    connState: "init",
    lastEnter: null,
    lastEnterError: null,
    lastSnapshotSize: null,
  });

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
    setDebug((d) => ({
      ...d,
      channelState: "init",
      connState: ably.connection.state,
      lastEnter: null,
      lastEnterError: null,
      lastSnapshotSize: null,
    }));

    console.log("[Presence] INIT userId:", userId, "connState:", ably.connection.state);

    const channel = ably.channels.get("presence:online");
    channelRef.current = channel;

    // -------- utils
    const memberToUserId = (m) => {
      const id = m?.data?.userId ?? m?.clientId;
      return id != null ? String(id) : null;
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
        setDebug((d) => ({ ...d, lastSnapshotSize: (members || []).length }));

        console.log(
          "[Presence] GET snapshot:",
          (members || []).map((m) => ({
            clientId: m.clientId,
            connectionId: m.connectionId,
            data: m.data,
          }))
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

        setDebug((d) => ({
          ...d,
          lastEnter: Date.now(),
          lastEnterError: err ? String(err?.message || err) : null,
        }));

        if (err) {
          enteredRef.current = false;
          return;
        }

        syncFromGet();
        setTimeout(syncFromGet, 500);
      });
    };

    const ensureEntered = () => {
      console.log("[Presence] ensureEntered connState =", ably.connection.state);
      if (ably.connection.state === "connected") enterPresence();
    };

    // -------- presence events (par action)
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

    // -------- CATCH-ALL presence events (preuve ultime)
    const onAnyPresence = (msg) => {
      console.log("[Presence] EVENT", msg.action, {
        clientId: msg.clientId,
        connectionId: msg.connectionId,
        data: msg.data,
      });
    };
    channel.presence.subscribe(onAnyPresence);

    // -------- channel lifecycle
    const onAttached = () => {
      console.log("[Presence] channel ATTACHED (event).");
      setDebug((d) => ({ ...d, channelState: "attached" }));
      syncFromGet();
      ensureEntered();
    };
    const onDetached = () => {
      console.log("[Presence] channel DETACHED.");
      setDebug((d) => ({ ...d, channelState: "detached" }));
    };
    const onFailed = (stateChange) => {
      console.log("[Presence] channel FAILED:", stateChange?.reason || null);
      setDebug((d) => ({ ...d, channelState: "failed" }));
    };

    channel.on("attached", onAttached);
    channel.on("detached", onDetached);
    channel.on("failed", onFailed);

    // -------- connection lifecycle
    const onConnState = (stateChange) => {
      setDebug((d) => ({ ...d, connState: stateChange.current }));
      console.log("[Presence] conn:", stateChange.current, stateChange.reason?.message || null);
      if (stateChange.current === "connected") {
        enteredRef.current = false;
        ensureEntered();
        setTimeout(syncFromGet, 300);
      }
    };
    ably.connection.on(onConnState);

    // -------- attach channel (callback)
    channel.attach((err) => {
      if (err) {
        console.log("[Presence] channel.attach error:", err);
        setDebug((d) => ({ ...d, channelState: "attach_error" }));
        return;
      }

      console.log("[Presence] channel.attach cb OK. connState:", ably.connection.state);
      setDebug((d) => ({ ...d, channelState: "attached_cb" }));

      syncFromGet();
      ensureEntered();
    });

    // -------- periodic re-sync + re-enter safety
    periodicRef.current = setInterval(() => {
      syncFromGet();
      // si pour une raison quelconque on a perdu la présence, on retente
      enteredRef.current = false;
      ensureEntered();
    }, 15000);

    // -------- visibility
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
        channel.off("attached", onAttached);
        channel.off("detached", onDetached);
        channel.off("failed", onFailed);
      } catch {}

      try {
        ably.connection.off(onConnState);
      } catch {}

      try {
        ably.channels.release("presence:online");
      } catch {}
    };
  }, [userId, pseudo]);

  // update data (ok)
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
    return { isOnline, onlineCount, counts, ready, debug };
  }, [counts, ready, debug]);

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
      debug: {},
    };
  }
  return ctx;
}
