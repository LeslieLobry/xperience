"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getAbly } from "../lib/ably";

const OnlineStatusContext = createContext(null);

function nowTag(id) {
  const d = new Date();
  return `[Presence ${id}] ${d.toLocaleTimeString("fr-FR")} `;
}

function safeAblyFingerprint(ably) {
  return {
    keyName: ably?.options?.keyName || null,
    realtimeHost: ably?.options?.realtimeHost || null,
    restHost: ably?.options?.restHost || null,
    tls: ably?.options?.tls,
    clientId: ably?.auth?.clientId || null,
  };
}

export function OnlineStatusProvider({ user, children }) {
  const [counts, setCounts] = useState({});
  const [ready, setReady] = useState(false);
  const [hasSignal, setHasSignal] = useState(false);

  const [debug, setDebug] = useState({
    instanceId: null,
    channelState: "init",
    connState: "init",
    lastEnter: null,
    lastEnterError: null,
    lastSnapshotSize: null,
    lastEventAt: null,
    lastEventAction: null,
    ably: null,
  });

  const instanceIdRef = useRef(
    Math.random().toString(16).slice(2, 7) + Date.now().toString(16).slice(-3)
  );

  const enteredRef = useRef(false);
  const cleanedUpRef = useRef(false);
  const channelRef = useRef(null);
  const periodicRef = useRef(null);

  // ✅ IMPORTANT: userId stable (string)
  const userId = user?.id ? String(user.id) : null;
  // ✅ pseudo peut changer sans relancer toute la machine
  const pseudoRef = useRef(user?.pseudo || null);
  useEffect(() => {
    pseudoRef.current = user?.pseudo || null;
  }, [user?.pseudo]);

  // ✅ computedReady = “j’ai reçu un signal réel”
  const computedReady = !!ready || !!hasSignal || (counts && Object.keys(counts).length > 0);

  // ✅ refcount global anti StrictMode / remount
  const g = globalThis;
  const inc = () => {
    g.__xp_presence_count = (g.__xp_presence_count || 0) + 1;
    return g.__xp_presence_count;
  };
  const dec = () => {
    g.__xp_presence_count = Math.max((g.__xp_presence_count || 1) - 1, 0);
    return g.__xp_presence_count;
  };

  useEffect(() => {
    const instanceId = instanceIdRef.current;

    // ✅ reset uniquement si pas de userId
    if (!userId) {
      setCounts({});
      setReady(false);
      setHasSignal(false);
      setDebug((d) => ({
        ...d,
        instanceId,
        channelState: "no_user",
        lastEventAt: Date.now(),
        lastEventAction: "no_user_reset",
      }));
      console.log(nowTag(instanceId), "NO USER -> reset presence state");
      return;
    }

    const ably = getAbly();
    if (!ably) {
      console.log(nowTag(instanceId), "ABLY = null (getAbly failed)");
      setCounts({});
      setReady(false);
      setHasSignal(false);
      setDebug((d) => ({
        ...d,
        instanceId,
        channelState: "no_ably",
        lastEventAt: Date.now(),
        lastEventAction: "no_ably",
      }));
      return;
    }

    const fp = safeAblyFingerprint(ably);
    console.log(nowTag(instanceId), "ABLY fingerprint =", fp);

    // ✅ refcount: seul le premier init réellement le channel+subscriptions
    const count = inc();

    cleanedUpRef.current = false;

    setReady(false);
    setHasSignal(false);
    setDebug((d) => ({
      ...d,
      instanceId,
      channelState: "init",
      connState: ably.connection.state,
      lastEnter: null,
      lastEnterError: null,
      lastSnapshotSize: null,
      lastEventAt: null,
      lastEventAction: null,
      ably: fp,
    }));

    console.log(
      nowTag(instanceId),
      "INIT userId:",
      userId,
      "pseudo:",
      pseudoRef.current,
      "connState:",
      ably.connection.state,
      "refcount:",
      count
    );

    const channelName = "presence:online";
    const channel = ably.channels.get(channelName);
    channelRef.current = channel;

    const memberToUserId = (m) => {
      const id = m?.data?.userId;
      return id != null ? String(id) : null;
    };

    const markSignal = (why) => {
      setHasSignal(true);
      setDebug((d) => ({
        ...d,
        lastEventAt: Date.now(),
        lastEventAction: why || d.lastEventAction,
      }));
    };

    const syncFromGet = (why = "get") => {
      channel.presence.get((err, members) => {
        if (err) {
          console.log(nowTag(instanceId), "presence.get error:", err);
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
        markSignal(why);
        setDebug((d) => ({ ...d, lastSnapshotSize: (members || []).length }));

        console.log(
          nowTag(instanceId),
          "GET snapshot size=",
          (members || []).length,
          "ids=",
          Object.keys(next)
        );
      });
    };

    const enterPresence = () => {
      if (enteredRef.current) return;
      enteredRef.current = true;

      console.log(nowTag(instanceId), "ENTER start", {
        userId,
        pseudo: pseudoRef.current,
        connState: ably.connection.state,
        ablyClientId: ably.auth?.clientId || null,
      });

      channel.presence.enter({ userId, pseudo: pseudoRef.current, t: Date.now() }, (err) => {
        console.log(nowTag(instanceId), "ENTER cb", err || "OK", { userId });

        setDebug((d) => ({
          ...d,
          lastEnter: Date.now(),
          lastEnterError: err ? String(err?.message || err) : null,
        }));

        if (err) {
          enteredRef.current = false;
          return;
        }

        // snapshot après enter
        syncFromGet("enter->get");
        setTimeout(() => syncFromGet("enter->get+500ms"), 500);
      });
    };

    const ensureEntered = () => {
      if (ably.connection.state === "connected") enterPresence();
    };

    // -------- presence events
    const onEnter = (m) => {
      const id = memberToUserId(m);
      if (!id) return;
      markSignal("event:enter");
      setCounts((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    };

    const onLeave = (m) => {
      const id = memberToUserId(m);
      if (!id) return;
      markSignal("event:leave");
      setCounts((prev) => {
        const next = { ...prev };
        const c = (next[id] || 0) - 1;
        if (c <= 0) delete next[id];
        else next[id] = c;
        return next;
      });
    };

    const onUpdate = () => {
      markSignal("event:update");
    };

    const onAnyPresence = (msg) => {
      setDebug((d) => ({
        ...d,
        lastEventAt: Date.now(),
        lastEventAction: msg.action,
      }));
      console.log(nowTag(instanceId), "EVENT", msg.action, {
        clientId: msg.clientId,
        connectionId: msg.connectionId,
        data: msg.data,
        id: msg.data?.userId ?? null,
      });
    };

    // -------- channel lifecycle
    const onAttached = () => {
      console.log(nowTag(instanceId), "channel ATTACHED", channelName);
      setDebug((d) => ({ ...d, channelState: "attached" }));
      syncFromGet("attached->get");
      ensureEntered();
    };

    const onDetached = () => {
      console.log(nowTag(instanceId), "channel DETACHED", channelName);
      setDebug((d) => ({ ...d, channelState: "detached" }));
    };

    const onFailed = (stateChange) => {
      console.log(nowTag(instanceId), "channel FAILED:", stateChange?.reason || null);
      setDebug((d) => ({ ...d, channelState: "failed" }));
    };

    // -------- connection lifecycle
    const onConnState = (stateChange) => {
      setDebug((d) => ({ ...d, connState: stateChange.current }));
      console.log(
        nowTag(instanceId),
        "conn:",
        stateChange.current,
        stateChange.reason?.message || null
      );

      if (stateChange.current === "connected") {
        // ✅ ne pas remettre enteredRef=false à chaque reconnexion de manière agressive
        // on laisse ensureEntered gérer (si déjà enter, Ably ignore/maintient)
        ensureEntered();
        setTimeout(() => syncFromGet("conn:connected->get"), 300);
      }
    };

    // ✅ IMPORTANT : seul le 1er consumer fait les subscriptions + attach
    if (count === 1) {
      enteredRef.current = false;

      channel.presence.subscribe("enter", onEnter);
      channel.presence.subscribe("leave", onLeave);
      channel.presence.subscribe("update", onUpdate);
      channel.presence.subscribe(onAnyPresence);

      channel.on("attached", onAttached);
      channel.on("detached", onDetached);
      channel.on("failed", onFailed);

      ably.connection.on(onConnState);

      channel.attach((err) => {
        if (err) {
          console.log(nowTag(instanceId), "channel.attach error:", err);
          setDebug((d) => ({ ...d, channelState: "attach_error" }));
          return;
        }
        console.log(nowTag(instanceId), "channel.attach cb OK. connState:", ably.connection.state);
        setDebug((d) => ({ ...d, channelState: "attached_cb" }));
        syncFromGet("attachcb->get");
        ensureEntered();
      });

      periodicRef.current = setInterval(() => {
        if (document.visibilityState !== "visible") return;
        syncFromGet("interval->get");
      }, 15000);

      const onVis = () => {
        console.log(nowTag(instanceId), "visibility:", document.visibilityState);
        if (document.visibilityState === "visible") {
          setTimeout(() => syncFromGet("vis->get"), 200);
          ensureEntered();
        }
      };
      document.addEventListener("visibilitychange", onVis);

      // stocke pour cleanup
      g.__xp_presence_onVis = onVis;
      g.__xp_presence_handlers = { onEnter, onLeave, onUpdate, onAnyPresence, onAttached, onDetached, onFailed, onConnState };
    } else {
      // ✅ pas le premier: on se contente d’un snapshot pour afficher vite
      syncFromGet("secondary->get");
      setReady(true);
    }

    return () => {
      if (cleanedUpRef.current) return;
      cleanedUpRef.current = true;

      const left = dec();
      console.log(nowTag(instanceId), "CLEANUP userId:", userId, "refcount now:", left);

      // ✅ seul le dernier nettoie réellement et LEAVE
      if (left !== 0) return;

      if (periodicRef.current) {
        clearInterval(periodicRef.current);
        periodicRef.current = null;
      }

      const onVis = g.__xp_presence_onVis;
      if (onVis) document.removeEventListener("visibilitychange", onVis);

      const h = g.__xp_presence_handlers || {};
      try { channel.presence.unsubscribe("enter", h.onEnter); } catch {}
      try { channel.presence.unsubscribe("leave", h.onLeave); } catch {}
      try { channel.presence.unsubscribe("update", h.onUpdate); } catch {}
      try { channel.presence.unsubscribe(h.onAnyPresence); } catch {}
      try { channel.off("attached", h.onAttached); } catch {}
      try { channel.off("detached", h.onDetached); } catch {}
      try { channel.off("failed", h.onFailed); } catch {}
      try { ably.connection.off(h.onConnState); } catch {}

      // ✅ leave propre (au lieu de release)
      try { channel.presence.leave(); } catch {}

      // ❌ NE PAS release ici (ça fout le bazar si réutilisé juste après)
      // try { ably.channels.release(channelName); } catch {}

      // reset refs
      enteredRef.current = false;
      g.__xp_presence_handlers = null;
      g.__xp_presence_onVis = null;
    };
  }, [userId]); // ✅ uniquement userId

  // ✅ Update: on peut update si connecté + entered (sans relancer la grosse init)
  useEffect(() => {
    if (!userId) return;
    const ch = channelRef.current;
    if (!ch) return;
    if (!enteredRef.current) return;

    try {
      ch.presence.update({ userId, pseudo: pseudoRef.current, t: Date.now() });
    } catch {}
  }, [userId, user?.pseudo]);

  const api = useMemo(() => {
    const isOnline = (id) => !!counts[String(id)];
    const onlineCount = (id) => counts[String(id)] || 0;

    return {
      isOnline,
      onlineCount,
      counts,
      ready: computedReady,
      debug: {
        ...debug,
        computedReady,
        countsIds: Object.keys(counts || {}),
      },
    };
  }, [counts, debug, computedReady]);

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
