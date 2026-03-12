"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { startPresence, subscribePresence } from "../lib/presenceManager";

const OnlineStatusContext = createContext(null);

function normalizeIds(ids) {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.map((id) => String(id)).filter(Boolean))];
}

export function OnlineStatusProvider({ userId, children }) {
  const [onlineIds, setOnlineIds] = useState([]);
  const [ready, setReady] = useState(false);
  const heartbeatRef = useRef(null);
  const unloadBoundRef = useRef(false);

  useEffect(() => {
    let stopPresence = null;
    let unsubPresence = null;
    let cancelled = false;

    setReady(false);
    setOnlineIds([]);

    if (!userId) return;

    async function boot() {
      try {
        stopPresence = await startPresence(userId);

        unsubPresence = subscribePresence((ids) => {
          if (cancelled) return;
          const next = normalizeIds(ids);
          setOnlineIds(next);
          setReady(true);

          console.log(
            "[OnlineStatus] presence update:",
            next.length,
            next.slice(0, 20)
          );
        });

        // heartbeat DB pour fallback serveur
        const sendHeartbeat = async () => {
          try {
            await fetch("/api/presence/heartbeat", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            });
          } catch (e) {
            console.error("[OnlineStatus] heartbeat error:", e);
          }
        };

        await sendHeartbeat();
        heartbeatRef.current = setInterval(sendHeartbeat, 30000);

        // sendBeacon fermeture / changement onglet
        const markInactive = () => {
          try {
            const blob = new Blob(
              [JSON.stringify({ state: document.hidden ? "hidden" : "close" })],
              { type: "application/json" }
            );
            navigator.sendBeacon("/api/presence/offline", blob);
          } catch (e) {
            console.error("[OnlineStatus] sendBeacon offline error:", e);
          }
        };

        const onVisibilityChange = () => {
          if (document.hidden) {
            markInactive();
          } else {
            fetch("/api/presence/heartbeat", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            }).catch(() => {});
          }
        };

        const onBeforeUnload = () => {
          markInactive();
        };

        if (!unloadBoundRef.current) {
          document.addEventListener("visibilitychange", onVisibilityChange);
          window.addEventListener("beforeunload", onBeforeUnload);
          unloadBoundRef.current = true;
        }

        return () => {
          document.removeEventListener("visibilitychange", onVisibilityChange);
          window.removeEventListener("beforeunload", onBeforeUnload);
          unloadBoundRef.current = false;
        };
      } catch (e) {
        console.error("[OnlineStatus] boot error:", e);
        if (!cancelled) {
          setReady(true);
          setOnlineIds([]);
        }
      }
    }

    let cleanupDom = null;

    boot().then((domCleanup) => {
      cleanupDom = domCleanup;
    });

    return () => {
      cancelled = true;

      try {
        if (cleanupDom) cleanupDom();
      } catch {}

      try {
        if (unsubPresence) unsubPresence();
      } catch {}

      try {
        if (stopPresence) stopPresence();
      } catch {}

      try {
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
      } catch {}
    };
  }, [userId]);

  const onlineSet = useMemo(() => {
    return new Set(onlineIds.map(String));
  }, [onlineIds]);

  const counts = useMemo(() => {
    const obj = {};
    for (const id of onlineIds) obj[String(id)] = 1;
    return obj;
  }, [onlineIds]);

  const api = useMemo(() => {
    return {
      ready,
      onlineIds,
      onlineSet,
      counts,
      isOnline: (id) => onlineSet.has(String(id)),
      debug: {
        userId: String(userId || ""),
        onlineLen: onlineIds.length,
        sample: onlineIds.slice(0, 25),
      },
    };
  }, [ready, onlineIds, onlineSet, counts, userId]);

  return (
    <OnlineStatusContext.Provider value={api}>
      {children}
    </OnlineStatusContext.Provider>
  );
}

export function useOnlineStatus() {
  return (
    useContext(OnlineStatusContext) || {
      ready: false,
      onlineIds: [],
      onlineSet: new Set(),
      counts: {},
      isOnline: () => false,
      debug: {},
    }
  );
}