"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Ably from "ably";

const OnlineStatusContext = createContext(null);

export function OnlineStatusProvider({ user, children }) {
  // counts = { "12": 2, "55": 1 } => user 12 online via 2 connexions (onglet + tel)
  const [counts, setCounts] = useState({});
  const ablyRef = useRef(null);
  const channelRef = useRef(null);
  const enteredRef = useRef(false);

  useEffect(() => {
    if (!user?.id) return;

    console.log("[Presence] init for user:", user.id);

    const ably = new Ably.Realtime({
      authUrl: "/api/presence/token",
      authMethod: "GET",
      echoMessages: false,
      closeOnUnload: false,
    });

    const channel = ably.channels.get("presence:online");
    ablyRef.current = ably;
    channelRef.current = channel;
    enteredRef.current = false;

    // ✅ logs connexion
    const onConnected = () => console.log("[Presence] Ably connected");
    const onDisconnected = () => console.log("[Presence] Ably disconnected");
    const onSuspended = () => console.log("[Presence] Ably suspended");
    const onFailed = (stateChange) => {
      console.log("[Presence] Ably failed", stateChange?.reason || stateChange);
    };

    ably.connection.on("connected", onConnected);
    ably.connection.on("disconnected", onDisconnected);
    ably.connection.on("suspended", onSuspended);
    ably.connection.on("failed", onFailed);

    const addOne = (id) => {
      const key = String(id);
      setCounts((prev) => {
        const next = { ...prev };
        next[key] = (next[key] || 0) + 1;
        return next;
      });
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

    const memberToUserId = (m) => {
      const id = Number(m?.clientId);
      return Number.isFinite(id) ? id : null;
    };

    const syncFromGet = () => {
      channel.presence.get((err, members) => {
        if (err) {
          console.log("[Presence] presence.get error:", err);
          return;
        }
        const ids = (members || []).map((m) => m?.clientId).filter(Boolean);
        console.log("[Presence] members:", ids);

        const next = {};
        for (const m of members || []) {
          const id = memberToUserId(m);
          if (id == null) continue;
          const key = String(id);
          next[key] = (next[key] || 0) + 1;
        }
        setCounts(next);
      });
    };

    const enterPresence = () => {
      if (enteredRef.current) return;
      enteredRef.current = true;

      console.log("[Presence] entering…");

      channel.presence.enter({ pseudo: user.pseudo || "", t: Date.now() }, (err) => {
        console.log("[Presence] enter callback err?:", err || null);
        if (err) {
          enteredRef.current = false; // retentera plus tard
          return;
        }
        syncFromGet();
      });
    };

    // ✅ Events présence (logs + counts)
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

    // ✅ Quand la connexion Ably est OK → on entre + sync
    const onConnectedDo = () => {
      enterPresence();
      syncFromGet();
    };
    ably.connection.on("connected", onConnectedDo);

    // ✅ Heartbeat
    const heartbeat = setInterval(() => {
      try {
        channel.presence.update({ t: Date.now() }, (err) => {
          if (err) console.log("[Presence] update err:", err);
        });
      } catch (e) {
        console.log("[Presence] update throw:", e);
      }
    }, 30000);

    // ✅ Clean : leave + close
    const cleanup = () => {
      console.log("[Presence] cleanup…");
      clearInterval(heartbeat);

      try {
        channel.presence.leave((err) => {
          if (err) console.log("[Presence] leave err:", err);
        });
      } catch (e) {
        console.log("[Presence] leave throw:", e);
      }

      try {
        channel.presence.unsubscribe("enter", onEnter);
        channel.presence.unsubscribe("leave", onLeave);
      } catch (e) {
        console.log("[Presence] unsubscribe throw:", e);
      }

      try {
        ably.connection.off("connected", onConnected);
        ably.connection.off("disconnected", onDisconnected);
        ably.connection.off("suspended", onSuspended);
        ably.connection.off("failed", onFailed);
        ably.connection.off("connected", onConnectedDo);
      } catch {}

      try {
        ably.close();
      } catch (e) {
        console.log("[Presence] close throw:", e);
      }
    };

    window.addEventListener("beforeunload", cleanup);

    return () => {
      window.removeEventListener("beforeunload", cleanup);
      cleanup();
    };
  }, [user?.id, user?.pseudo]);

  const api = useMemo(() => {
    const isOnline = (userId) => !!counts[String(userId)];
    const onlineCount = (userId) => counts[String(userId)] || 0;
    return { isOnline, onlineCount, counts };
  }, [counts]);

  return (
    <OnlineStatusContext.Provider value={api}>
      {children}
    </OnlineStatusContext.Provider>
  );
}

export function useOnlineStatus() {
  const ctx = useContext(OnlineStatusContext);
  if (!ctx) {
    return { isOnline: () => false, onlineCount: () => 0, counts: {} };
  }
  return ctx;
}
