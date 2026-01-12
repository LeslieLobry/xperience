"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ably } from "../lib/ably";

const OnlineStatusContext = createContext(null);

export function OnlineStatusProvider({ user, children }) {
  const [counts, setCounts] = useState({});
  const [ready, setReady] = useState(false);

  const enteredRef = useRef(false);
  const cleanedUpRef = useRef(false);
  const channelRef = useRef(null);
  const periodicRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;
    if (!ably) return;

    cleanedUpRef.current = false;
    enteredRef.current = false;
    setCounts({});
    setReady(false);

    const myUserId = String(user.id);

    console.log("[Presence] INIT userId:", myUserId, "connState:", ably.connection.state);

    const channel = ably.channels.get("presence:online");
    channelRef.current = channel;

    const memberToUserId = (m) => {
      const id = m?.clientId;
      return id ? String(id) : null;
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

    console.log(
      "[Presence] GET members:",
      (members || []).map((m) => ({
        clientId: m.clientId,
        connectionId: m.connectionId,
        data: m.data,
      }))
    );

    const next = {};
    for (const m of members || []) {
      const id = memberToUserId(m);
      if (!id) continue;
      next[id] = (next[id] || 0) + 1;
    }
    setCounts(next);
    setReady(true);
  });
};


const enterPresence = () => {
  if (enteredRef.current) return;
  enteredRef.current = true;

  console.log("[Presence] ENTER start", {
    userId: String(user.id),
    ablyClientId: ably.auth?.clientId || null,
    connState: ably.connection.state,
  });

  channel.presence.enter({ t: Date.now() }, (err) => {
    console.log("[Presence] ENTER cb", err || "OK", {
      userId: String(user.id),
      ablyClientId: ably.auth?.clientId || null,
    });

    if (err) {
      enteredRef.current = false;
      return;
    }
    syncFromGet();
    setTimeout(syncFromGet, 500);
  });
};

    const ensureEntered = () => {
      // On peut appeler souvent : c'est protégé par enteredRef
      if (ably.connection.state === "connected") {
        enterPresence();
      }
    };

    const onConnected = () => {
      console.log("[Presence] CONNECTED. ably clientId:", ably.auth?.clientId || null);
      enteredRef.current = false; // autorise re-enter après reconnexion
      ensureEntered();
      setTimeout(syncFromGet, 300);
    };

    const onDisconnected = () => {
      console.log("[Presence] DISCONNECTED");
      // laisse Ably gérer la reconnexion, mais on autorise un re-enter au prochain connected
      enteredRef.current = false;
      setReady(false); // optionnel : tu peux commenter si tu veux garder le dernier état
    };

    const onEnter = (m) => {
      const id = memberToUserId(m);
      // console.log("[Presence] enter event:", id);
      if (id != null) addOne(id);
    };

    const onLeave = (m) => {
      const id = memberToUserId(m);
      // console.log("[Presence] leave event:", id);
      if (id != null) removeOne(id);
    };

    const onUpdate = () => {
      // certains cas (recovery) envoient update plutôt que enter/leave
      setTimeout(syncFromGet, 100);
    };

    // ✅ subscribe presence events
    channel.presence.subscribe("enter", onEnter);
    channel.presence.subscribe("leave", onLeave);
    channel.presence.subscribe("update", onUpdate);

    // ✅ connection events
    ably.connection.on("connected", onConnected);
    ably.connection.on("disconnected", onDisconnected);

    // ✅ On s'assure que le channel est attaché avant snapshot/enter
    channel.attach((err) => {
      if (err) {
        console.log("[Presence] channel.attach error:", err);
        return;
      }

      console.log("[Presence] channel ATTACHED. connState:", ably.connection.state);

      // Snapshot initial + enter si déjà connecté
      syncFromGet();
      ensureEntered();
    });

    // ✅ sync périodique
    periodicRef.current = setInterval(syncFromGet, 15000);

    const onVis = () => {
      if (document.visibilityState === "visible") {
        setTimeout(syncFromGet, 200);
        // on retente un enter au retour onglet si nécessaire
        enteredRef.current = false;
        ensureEntered();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      if (cleanedUpRef.current) return;
      cleanedUpRef.current = true;

      console.log("[Presence] CLEANUP userId:", myUserId);

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
        ably.connection.off("connected", onConnected);
        ably.connection.off("disconnected", onDisconnected);
      } catch {}

      // ✅ pas de leave ici (évite clignotements sur navigation)
      // closeOnUnload gère la sortie réelle.
      // On peut relâcher le channel pour limiter les listeners (optionnel)
      try {
        ably.channels.release("presence:online");
      } catch {}
    };
  }, [user?.id, user?.pseudo]); // ✅ important : pseudo change => data presence change aussi

  const api = useMemo(() => {
    const isOnline = (userId) => !!counts[String(userId)];
    const onlineCount = (userId) => counts[String(userId)] || 0;
    return { isOnline, onlineCount, counts, ready };
  }, [counts, ready]);

  return (
    <OnlineStatusContext.Provider value={api}>
      {children}
    </OnlineStatusContext.Provider>
  );
}

export function useOnlineStatus() {
  const ctx = useContext(OnlineStatusContext);
  if (!ctx) return { isOnline: () => false, onlineCount: () => 0, counts: {}, ready: false };
  return ctx;
}
