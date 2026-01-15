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

export function OnlineStatusProvider({ user, children }) {
  const [counts, setCounts] = useState({});
  const [ready, setReady] = useState(false);

  // ✅ on marque "prêt" dès qu’on a AU MOINS un signal fiable (snapshot OU event)
  const [hasSignal, setHasSignal] = useState(false);

  // debug
  const [debug, setDebug] = useState({
    instanceId: null,
    channelState: "init",
    connState: "init",
    lastEnter: null,
    lastEnterError: null,
    lastSnapshotSize: null,
    lastEventAt: null,
    lastEventAction: null,
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

  // ✅ prêt = ready OR hasSignal OR counts non vide
  const computedReady =
    !!ready || !!hasSignal || (counts && Object.keys(counts).length > 0);

  useEffect(() => {
    if (!userId) return;

    const ably = getAbly();
    if (!ably) return;

    cleanedUpRef.current = false;
    enteredRef.current = false;

    // reset states
    setCounts({});
    setReady(false);
    setHasSignal(false);
    setDebug((d) => ({
      ...d,
      instanceId: instanceIdRef.current,
      channelState: "init",
      connState: ably.connection.state,
      lastEnter: null,
      lastEnterError: null,
      lastSnapshotSize: null,
      lastEventAt: null,
      lastEventAction: null,
    }));

    console.log(
      nowTag(instanceIdRef.current),
      "INIT userId:",
      userId,
      "pseudo:",
      pseudo,
      "connState:",
      ably.connection.state
    );

    const channel = ably.channels.get("presence:online");
    channelRef.current = channel;

    // -------- utils
    const memberToUserId = (m) => {
      const id = m?.data?.userId ?? m?.clientId;
      return id != null ? String(id) : null;
    };

    const markSignal = (why) => {
      // ✅ on déclare que la présence est exploitable
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
          console.log(nowTag(instanceIdRef.current), "presence.get error:", err);
          return;
        }

        const next = {};
        for (const m of members || []) {
          const id = memberToUserId(m);
          if (!id) continue;
          next[id] = (next[id] || 0) + 1;
        }

        setCounts(next);

        // ✅ snapshot = prêt “officiel”
        setReady(true);
        markSignal(why);

        setDebug((d) => ({ ...d, lastSnapshotSize: (members || []).length }));

        console.log(
          nowTag(instanceIdRef.current),
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

      console.log(nowTag(instanceIdRef.current), "ENTER start", {
        userId,
        pseudo,
        connState: ably.connection.state,
        ablyClientId: ably.auth?.clientId || null,
      });

      channel.presence.enter({ userId, pseudo, t: Date.now() }, (err) => {
        console.log(nowTag(instanceIdRef.current), "ENTER cb", err || "OK", {
          userId,
        });

        setDebug((d) => ({
          ...d,
          lastEnter: Date.now(),
          lastEnterError: err ? String(err?.message || err) : null,
        }));

        if (err) {
          enteredRef.current = false;
          return;
        }

        // ✅ après enter on force un snapshot
        syncFromGet("enter->get");
        setTimeout(() => syncFromGet("enter->get+500ms"), 500);
      });
    };

    const ensureEntered = () => {
      console.log(
        nowTag(instanceIdRef.current),
        "ensureEntered connState =",
        ably.connection.state
      );
      if (ably.connection.state === "connected") enterPresence();
    };

    // -------- presence events
    const onEnter = (m) => {
      const id = memberToUserId(m);
      if (!id) return;

      markSignal("event:enter");

      setCounts((prev) => ({
        ...prev,
        [id]: (prev[id] || 0) + 1,
      }));
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
      // petit resync derrière
      setTimeout(() => syncFromGet("event:update->get"), 100);
    };

    channel.presence.subscribe("enter", onEnter);
    channel.presence.subscribe("leave", onLeave);
    channel.presence.subscribe("update", onUpdate);

    // catch-all
    const onAnyPresence = (msg) => {
      setDebug((d) => ({
        ...d,
        lastEventAt: Date.now(),
        lastEventAction: msg.action,
      }));
      console.log(nowTag(instanceIdRef.current), "EVENT", msg.action, {
        clientId: msg.clientId,
        connectionId: msg.connectionId,
        data: msg.data,
        id: msg.data?.userId ?? msg.clientId,
      });
    };
    channel.presence.subscribe(onAnyPresence);

    // -------- channel lifecycle
    const onAttached = () => {
      console.log(nowTag(instanceIdRef.current), "channel ATTACHED");
      setDebug((d) => ({ ...d, channelState: "attached" }));
      syncFromGet("attached->get");
      ensureEntered();
    };

    const onDetached = () => {
      console.log(nowTag(instanceIdRef.current), "channel DETACHED");
      setDebug((d) => ({ ...d, channelState: "detached" }));
    };

    const onFailed = (stateChange) => {
      console.log(
        nowTag(instanceIdRef.current),
        "channel FAILED:",
        stateChange?.reason || null
      );
      setDebug((d) => ({ ...d, channelState: "failed" }));
    };

    channel.on("attached", onAttached);
    channel.on("detached", onDetached);
    channel.on("failed", onFailed);

    // -------- connection lifecycle
    const onConnState = (stateChange) => {
      setDebug((d) => ({ ...d, connState: stateChange.current }));
      console.log(
        nowTag(instanceIdRef.current),
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
        console.log(nowTag(instanceIdRef.current), "channel.attach error:", err);
        setDebug((d) => ({ ...d, channelState: "attach_error" }));
        return;
      }

      console.log(
        nowTag(instanceIdRef.current),
        "channel.attach cb OK. connState:",
        ably.connection.state
      );
      setDebug((d) => ({ ...d, channelState: "attached_cb" }));

      syncFromGet("attachcb->get");
      ensureEntered();
    });

    // periodic
    periodicRef.current = setInterval(() => {
      syncFromGet("interval->get");
      enteredRef.current = false;
      ensureEntered();
    }, 15000);

    // visibility
    const onVis = () => {
      console.log(
        nowTag(instanceIdRef.current),
        "visibility:",
        document.visibilityState
      );
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

      console.log(nowTag(instanceIdRef.current), "CLEANUP userId:", userId);

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

    return {
      isOnline,
      onlineCount,
      counts,
      ready: computedReady, // ✅ IMPORTANT : on expose computedReady
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
