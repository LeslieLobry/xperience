"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { startPresence, subscribePresence } from "../lib/presenceManager";

const OnlineStatusContext = createContext(null);

export function OnlineStatusProvider({ userId, children }) {
  const [onlineIds, setOnlineIds] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stop = null;
    let unsub = null;

    setReady(false);
    setOnlineIds([]);

    if (!userId) return;

    (async () => {
      stop = await startPresence(userId);
      unsub = subscribePresence((ids) => {
        setOnlineIds(ids);
        setReady(true);
      });
    })();

    return () => {
      if (unsub) unsub();
      if (stop) stop();
    };
  }, [userId]);

  const api = useMemo(() => {
    return {
      ready,
      onlineIds,
      isOnline: (id) => onlineIds.includes(String(id)),
    };
  }, [ready, onlineIds]);

  return <OnlineStatusContext.Provider value={api}>{children}</OnlineStatusContext.Provider>;
}

export function useOnlineStatus() {
  return useContext(OnlineStatusContext) || { ready: false, onlineIds: [], isOnline: () => false };
}
