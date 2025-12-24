"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
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

    // ✅ Ably Realtime avec token via route
    const ably = new Ably.Realtime({
      authUrl: "/api/presence/token",
      authMethod: "GET",
      echoMessages: false,
      // important: évite que le navigateur coupe trop agressivement
      closeOnUnload: false,
    });

    const channel = ably.channels.get("presence:online");
    ablyRef.current = ably;
    channelRef.current = channel;
    enteredRef.current = false;

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
      // on prend clientId (défini par tokenRequest)
      const id = Number(m?.clientId);
      return Number.isFinite(id) ? id : null;
    };

    const syncFromGet = () => {
      channel.presence.get((err, members) => {
        if (err) return;
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

      channel.presence.enter(
        { pseudo: user.pseudo || "", t: Date.now() },
        (err) => {
          if (err) {
            // si ça rate, on retentera au prochain connected
            enteredRef.current = false;
            return;
          }
          // ✅ récup état initial
          syncFromGet();
        }
      );
    };

    // ✅ Events présence
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

    // ✅ Quand la connexion Ably est OK → on entre en présence
    ably.connection.on("connected", () => {
      enterPresence();
    });

    // ✅ Si Ably se reconnecte, on resync pour éviter les faux états
    ably.connection.on("connected", syncFromGet);

    // ✅ Heartbeat (optionnel mais rend les états plus “clean”)
    const heartbeat = setInterval(() => {
      try {
        channel.presence.update({ t: Date.now() }, () => {});
      } catch {}
    }, 30000);

    // ✅ Clean : leave + close
    const cleanup = () => {
      clearInterval(heartbeat);
      try {
        channel.presence.leave(() => {});
      } catch {}
      try {
        channel.presence.unsubscribe("enter", onEnter);
        channel.presence.unsubscribe("leave", onLeave);
      } catch {}
      try {
        ably.close();
      } catch {}
    };

    window.addEventListener("beforeunload", cleanup);

    return () => {
      window.removeEventListener("beforeunload", cleanup);
      cleanup();
    };
  }, [user?.id]);

  const api = useMemo(() => {
    const isOnline = (userId) => !!counts[String(userId)];
    const onlineCount = (userId) => counts[String(userId)] || 0;
    return { isOnline, onlineCount, counts };
  }, [counts]);

  return <OnlineStatusContext.Provider value={api}>{children}</OnlineStatusContext.Provider>;
}

export function useOnlineStatus() {
  const ctx = useContext(OnlineStatusContext);
  if (!ctx) {
    return { isOnline: () => false, onlineCount: () => 0, counts: {} };
  }
  return ctx;
}
