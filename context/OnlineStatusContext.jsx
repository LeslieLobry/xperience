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

function nowTag(id) {
  const d = new Date();
  return `[Presence ${id}] ${d.toLocaleTimeString("fr-FR")} `;
}

function safeAblyFingerprint(ably) {
  // ⚠️ ne log JAMAIS la clé complète
  // Ably JS expose souvent: ably.options.keyName (ex: "xxxxx")
  // et ably.options.restHost / realtimeHost selon config
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

  const userId = user?.id ? String(user.id) : null;
  const pseudo = user?.pseudo || null;

  // ✅ computedReady = “j’ai reçu un signal réel”
  const computedReady =
    !!ready || !!hasSignal || (counts && Object.keys(counts).length > 0);

  useEffect(() => {
    const instanceId = instanceIdRef.current;

    // ✅ IMPORTANT : si pas de user => reset propre (sinon UI incohérente)
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

    cleanedUpRef.current = false;
    enteredRef.current = false;

    setCounts({});
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
      pseudo,
      "connState:",
      ably.connection.state
    );

    const channelName = "presence:online";
    const channel = ably.channels.get(channelName);
    channelRef.current = channel;

    // ✅ On ne compte QUE data.userId (pas clientId)
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
        pseudo,
        connState: ably.connection.state,
        ablyClientId: ably.auth?.clientId || null,
      });

      channel.presence.enter({ userId, pseudo, t: Date.now() }, (err) => {
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
      console.log(nowTag(instanceId), "ensureEntered connState =", ably.connection.state);
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

    channel.presence.subscribe("enter", onEnter);
    channel.presence.subscribe("leave", onLeave);
    channel.presence.subscribe("update", onUpdate);

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
    channel.presence.subscribe(onAnyPresence);

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

    channel.on("attached", onAttached);
    channel.on("detached", onDetached);
    channel.on("failed", onFailed);

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
        enteredRef.current = false;
        ensureEntered();
        setTimeout(() => syncFromGet("conn:connected->get"), 300);
      }
    };
    ably.connection.on(onConnState);

    // attach
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

    // periodic snapshot (visible only)
    periodicRef.current = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      syncFromGet("interval->get");
    }, 15000);

    const onVis = () => {
      console.log(nowTag(instanceId), "visibility:", document.visibilityState);
      if (document.visibilityState === "visible") {
        setTimeout(() => syncFromGet("vis->get"), 200);
        enteredRef.current = false;
        ensureEntered();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      if (cleanedUpRef.current) return;
      cleanedUpRef.current = true;

      console.log(nowTag(instanceId), "CLEANUP userId:", userId);

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

      // ✅ important: libère le channel
      try {
        ably.channels.release("presence:online");
      } catch {}
    };
  }, [userId, pseudo]);

  // ✅ Update uniquement si entré
  useEffect(() => {
    if (!userId) return;
    if (!enteredRef.current) return;
    const ch = channelRef.current;
    if (!ch) return;

    try {
      ch.presence.update({ userId, pseudo, t: Date.now() });
    } catch {}
  }, [userId, pseudo]);

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

  return (
    <OnlineStatusContext.Provider value={api}>
      {children}
    </OnlineStatusContext.Provider>
  );
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
