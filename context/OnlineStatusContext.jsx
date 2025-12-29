"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import Ably from "ably";

const OnlineStatusContext = createContext(null);

export function OnlineStatusProvider({ user, children }) {
  const [counts, setCounts] = useState({});
  const enteredRef = useRef(false);
  const cleanedUpRef = useRef(false);

  useEffect(() => {
    if (!user?.id) return;

    console.log("[Presence] init for user:", user.id);

    cleanedUpRef.current = false;

    const ably = new Ably.Realtime({
      authUrl: "/api/presence/token",
      authMethod: "GET",
      echoMessages: false,
      closeOnUnload: false,
    });

    const channel = ably.channels.get("presence:online");
    enteredRef.current = false;

    const memberToUserId = (m) => {
      const id = Number(m?.clientId);
      return Number.isFinite(id) ? id : null;
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
          if (id == null) continue;
          const key = String(id);
          next[key] = (next[key] || 0) + 1;
        }
        setCounts(next);

        const ids = (members || []).map((m) => m?.clientId).filter(Boolean);
        console.log("[Presence] members:", ids);
      });
    };

    const enterPresence = () => {
      if (enteredRef.current) return;
      enteredRef.current = true;

      console.log("[Presence] entering…");

      channel.presence.enter(
        { pseudo: user.pseudo || "", t: Date.now() },
        (err) => {
          console.log("[Presence] enter callback err?:", err || null);
          if (err) {
            enteredRef.current = false;
            return;
          }

          // sync direct + sync retardée (les membres déjà présents)
          syncFromGet();
          setTimeout(syncFromGet, 500);
        }
      );
    };

    // ---- connection logs + robust reconnect handling ----
    const onConnectionState = (stateChange) => {
      const state = stateChange?.current || stateChange;
      console.log("[Presence] Ably state:", stateChange?.current || stateChange);

      // Important : à chaque "connected", on autorise un re-enter
      if (state === "connected") {
        enteredRef.current = false;
        enterPresence();
        setTimeout(syncFromGet, 500);
      }
    };

    ably.connection.on(onConnectionState);

    // ---- présence events ----
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

    // ---- sync périodique léger ----
    const periodicSync = setInterval(() => {
      syncFromGet();
    }, 15000);

    // ---- cleanup (idempotent) ----
    const cleanup = () => {
      if (cleanedUpRef.current) return;
      cleanedUpRef.current = true;

      console.log("[Presence] cleanup…");
      clearInterval(periodicSync);

      try {
        channel.presence.unsubscribe("enter", onEnter);
        channel.presence.unsubscribe("leave", onLeave);
      } catch (e) {
        console.log("[Presence] unsubscribe throw:", e);
      }

      try {
        // leave best-effort (souvent ignoré par le navigateur en unload)
        channel.presence.leave((err) => {
          if (err) console.log("[Presence] leave err:", err);
        });
      } catch (e) {
        console.log("[Presence] leave throw:", e);
      }

      try {
        ably.connection.off(onConnectionState);
      } catch {}

      try {
        // libère le channel proprement
        ably.channels.release("presence:online");
      } catch {}

      try {
        ably.close();
      } catch (e) {
        console.log("[Presence] close throw:", e);
      }
    };

    // unload : best-effort
    window.addEventListener("beforeunload", cleanup);

    // Optionnel mais utile : quand l’onglet redevient visible, resync
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
    const isOnline = (userId) => !!counts[String(userId)];
    const onlineCount = (userId) => counts[String(userId)] || 0;
    return { isOnline, onlineCount, counts };
  }, [counts]);

  return <OnlineStatusContext.Provider value={api}>{children}</OnlineStatusContext.Provider>;
}

export function useOnlineStatus() {
  const ctx = useContext(OnlineStatusContext);
  if (!ctx) return { isOnline: () => false, onlineCount: () => 0, counts: {} };
  return ctx;
}
