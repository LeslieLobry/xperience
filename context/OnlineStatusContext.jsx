"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getAbly } from "../lib/ably";

const OnlineStatusContext = createContext(null);

function now() {
  return new Date().toISOString().slice(11, 19); // HH:MM:SS
}

export function OnlineStatusProvider({ user, children }) {
  const [counts, setCounts] = useState({});
  const [ready, setReady] = useState(false);

  const channelRef = useRef(null);
  const enteredRef = useRef(false);
  const periodicRef = useRef(null);

  // ⚠️ identifie une instance provider (si ça change souvent => remount)
  const instanceIdRef = useRef(`P${Math.random().toString(16).slice(2, 8)}`);

  const userId = user?.id ? String(user.id) : null;
  const pseudo = user?.pseudo || null;

  // debug state (visible dans UI si tu veux)
  const [debug, setDebug] = useState({
    instanceId: instanceIdRef.current,
    userId: null,
    pseudo: null,
    connState: null,
    connId: null,
    ablyClientId: null,
    channelState: "init",
    lastAttach: null,
    lastEnter: null,
    lastEnterErr: null,
    lastSnapshot: null,
    lastSnapshotIds: [],
    lastEvent: null,
    lastCleanup: null,
  });

  useEffect(() => {
    if (!userId) return;

    const ably = getAbly();
    if (!ably) return;

    const instanceId = instanceIdRef.current;

    console.log(`[Presence ${instanceId}] ${now()} INIT`, {
      userId,
      pseudo,
      connState: ably.connection.state,
      connId: ably.connection.id || null,
      ablyClientId: ably.auth?.clientId || null,
    });

    setCounts({});
    setReady(false);
    enteredRef.current = false;

    setDebug((d) => ({
      ...d,
      instanceId,
      userId,
      pseudo,
      connState: ably.connection.state,
      connId: ably.connection.id || null,
      ablyClientId: ably.auth?.clientId || null,
      channelState: "init",
      lastCleanup: null,
    }));

    const channel = ably.channels.get("presence:online");
    channelRef.current = channel;

    const memberToUserId = (m) => {
      const id = m?.data?.userId ?? m?.clientId;
      return id != null ? String(id) : null;
    };

    const syncFromGet = (reason = "manual") => {
      channel.presence.get((err, members) => {
        if (err) {
          console.log(`[Presence ${instanceId}] ${now()} GET error`, err);
          return;
        }

        const next = {};
        for (const m of members || []) {
          const id = memberToUserId(m);
          if (!id) continue;
          next[id] = (next[id] || 0) + 1;
        }

        const ids = Object.keys(next);

        console.log(`[Presence ${instanceId}] ${now()} SNAPSHOT(${reason})`, {
          size: (members || []).length,
          ids,
          raw: (members || []).map((m) => ({
            clientId: m.clientId,
            connectionId: m.connectionId,
            data: m.data,
          })),
        });

        setCounts(next);
        setReady(true);
        setDebug((d) => ({
          ...d,
          lastSnapshot: Date.now(),
          lastSnapshotIds: ids,
        }));
      });
    };

    const enterPresence = (reason = "ensure") => {
      if (enteredRef.current) {
        console.log(`[Presence ${instanceId}] ${now()} ENTER skip (already entered)`, { reason });
        return;
      }
      enteredRef.current = true;

      console.log(`[Presence ${instanceId}] ${now()} ENTER start`, {
        reason,
        userId,
        pseudo,
        connState: ably.connection.state,
        connId: ably.connection.id || null,
        ablyClientId: ably.auth?.clientId || null,
      });

      channel.presence.enter({ userId, pseudo, t: Date.now() }, (err) => {
        console.log(`[Presence ${instanceId}] ${now()} ENTER cb`, err || "OK");

        setDebug((d) => ({
          ...d,
          lastEnter: Date.now(),
          lastEnterErr: err ? String(err?.message || err) : null,
        }));

        if (err) {
          enteredRef.current = false;
          return;
        }

        // snapshot juste après enter
        syncFromGet("after-enter");
        setTimeout(() => syncFromGet("after-enter+400ms"), 400);
      });
    };

    const ensureEntered = (reason = "ensureEntered") => {
      console.log(`[Presence ${instanceId}] ${now()} ensureEntered`, {
        reason,
        connState: ably.connection.state,
      });
      if (ably.connection.state === "connected") enterPresence(reason);
    };

    // presence events
    const onEnter = (m) => {
      const id = memberToUserId(m);
      console.log(`[Presence ${instanceId}] ${now()} EVENT enter`, {
        id,
        clientId: m.clientId,
        connectionId: m.connectionId,
        data: m.data,
      });
      if (!id) return;
      setCounts((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
      setDebug((d) => ({ ...d, lastEvent: `enter:${id}` }));
    };

    const onLeave = (m) => {
      const id = memberToUserId(m);
      console.log(`[Presence ${instanceId}] ${now()} EVENT leave`, {
        id,
        clientId: m.clientId,
        connectionId: m.connectionId,
        data: m.data,
      });
      if (!id) return;
      setCounts((prev) => {
        const next = { ...prev };
        const c = (next[id] || 0) - 1;
        if (c <= 0) delete next[id];
        else next[id] = c;
        return next;
      });
      setDebug((d) => ({ ...d, lastEvent: `leave:${id}` }));
    };

    const onUpdate = (m) => {
      const id = memberToUserId(m);
      console.log(`[Presence ${instanceId}] ${now()} EVENT update`, {
        id,
        clientId: m.clientId,
        connectionId: m.connectionId,
        data: m.data,
      });
      setDebug((d) => ({ ...d, lastEvent: `update:${id || "?"}` }));
      setTimeout(() => syncFromGet("after-update"), 150);
    };

    channel.presence.subscribe("enter", onEnter);
    channel.presence.subscribe("leave", onLeave);
    channel.presence.subscribe("update", onUpdate);

    // channel state events
    const onAttached = () => {
      console.log(`[Presence ${instanceId}] ${now()} channel ATTACHED (event)`);
      setDebug((d) => ({ ...d, channelState: "attached", lastAttach: Date.now() }));
      syncFromGet("on-attached");
      ensureEntered("on-attached");
    };
    const onDetached = () => {
      console.log(`[Presence ${instanceId}] ${now()} channel DETACHED (event)`);
      setDebug((d) => ({ ...d, channelState: "detached" }));
    };
    const onFailed = (st) => {
      console.log(`[Presence ${instanceId}] ${now()} channel FAILED`, st?.reason?.message || st?.reason);
      setDebug((d) => ({ ...d, channelState: "failed" }));
    };

    channel.on("attached", onAttached);
    channel.on("detached", onDetached);
    channel.on("failed", onFailed);

    // connection events
    const onConn = (stateChange) => {
      console.log(`[Presence ${instanceId}] ${now()} conn`, stateChange.current, {
        reason: stateChange.reason?.message || null,
        connId: ably.connection.id || null,
        clientId: ably.auth?.clientId || null,
      });

      setDebug((d) => ({
        ...d,
        connState: stateChange.current,
        connId: ably.connection.id || null,
        ablyClientId: ably.auth?.clientId || null,
      }));

      if (stateChange.current === "connected") {
        enteredRef.current = false;
        ensureEntered("on-connected");
        setTimeout(() => syncFromGet("on-connected+250ms"), 250);
      }

      if (stateChange.current === "disconnected") {
        setReady(false);
      }
    };
    ably.connection.on(onConn);

    // attach
    channel.attach((err) => {
      if (err) {
        console.log(`[Presence ${instanceId}] ${now()} attach cb ERROR`, err);
        setDebug((d) => ({ ...d, channelState: "attach_error" }));
        return;
      }
      console.log(`[Presence ${instanceId}] ${now()} attach cb OK`);
      setDebug((d) => ({ ...d, channelState: "attached_cb", lastAttach: Date.now() }));
      syncFromGet("attach-cb");
      ensureEntered("attach-cb");
    });

    // periodic snapshot only
    periodicRef.current = setInterval(() => syncFromGet("interval"), 15000);

    // visibility
    const onVis = () => {
      if (document.visibilityState === "visible") {
        console.log(`[Presence ${instanceId}] ${now()} visibility: visible`);
        setTimeout(() => syncFromGet("visible"), 250);
        enteredRef.current = false;
        ensureEntered("visible");
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      console.log(`[Presence ${instanceId}] ${now()} CLEANUP`, { userId });
      setDebug((d) => ({ ...d, lastCleanup: Date.now() }));

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
        channel.off("attached", onAttached);
        channel.off("detached", onDetached);
        channel.off("failed", onFailed);
      } catch {}

      try {
        ably.connection.off(onConn);
      } catch {}

      try {
        ably.channels.release("presence:online");
      } catch {}

      channelRef.current = null;
      enteredRef.current = false;
    };
  }, [userId]); // ✅ UNIQUEMENT userId

  // pseudo update séparé
  useEffect(() => {
    if (!userId) return;
    const ch = channelRef.current;
    if (!ch) return;

    try {
      console.log(`[Presence ${instanceIdRef.current}] ${now()} UPDATE data`, { userId, pseudo });
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
