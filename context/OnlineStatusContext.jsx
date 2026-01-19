"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, useRef } from "react";
import { startPresence, subscribePresence } from "../lib/presenceManager";

const OnlineStatusContext = createContext(null);

export function OnlineStatusProvider({ userId, children }) {
  const [onlineIds, setOnlineIds] = useState([]);
  const [ready, setReady] = useState(false);

  const lastIdsRef = useRef([]);

  useEffect(() => {
    let stop = null;
    let unsub = null;

    setReady(false);
    setOnlineIds([]);

    if (!userId) return;

    (async () => {
      stop = await startPresence(userId);

      unsub = subscribePresence((ids) => {
        const next = Array.isArray(ids) ? ids.map(String) : [];
        lastIdsRef.current = next;

        setOnlineIds(next);
        setReady(true);

        console.log("[OnlineStatus] update onlineIds=", next.length, "sample=", next.slice(0, 20));
      });
    })();

    return () => {
      try {
        if (unsub) unsub();
      } catch {}
      try {
        if (stop) stop();
      } catch {}
    };
  }, [userId]);

  // ✅ Compat : reconstruit un objet counts { [id]: 1 }
  const counts = useMemo(() => {
    const obj = {};
    for (const id of onlineIds) obj[String(id)] = 1;
    return obj;
  }, [onlineIds]);

  const api = useMemo(() => {
    return {
      ready,
      onlineIds,

      // ✅ compat anciens composants
      counts,

      // ✅ helper
      isOnline: (id) => onlineIds.includes(String(id)),

      // ✅ debug léger
      debug: {
        userId: String(userId || ""),
        onlineLen: onlineIds.length,
        sample: onlineIds.slice(0, 25),
      },
    };
  }, [ready, onlineIds, counts, userId]);

  return <OnlineStatusContext.Provider value={api}>{children}</OnlineStatusContext.Provider>;
}

export function useOnlineStatus() {
  return (
    useContext(OnlineStatusContext) || {
      ready: false,
      onlineIds: [],
      counts: {},
      isOnline: () => false,
      debug: {},
    }
  );
}
