"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

export default function HeartbeatClient({
  intervalMs = 60_000,
  immediate = true,
} = {}) {
  const pathname = usePathname();
  const timerRef = useRef(null);

  const { user, authReady } = useAuth() || {};

  const send = () => {
    // ✅ pas prêt / pas connecté => pas de heartbeat
    if (!authReady || !user?.id) return;

    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    fetch("/api/me/heartbeat", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    }).catch(() => {});
  };

  useEffect(() => {
    // ✅ tant que pas ready / pas user => on stoppe tout
    if (!authReady || !user?.id) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const start = () => {
      if (immediate) send();
      timerRef.current = window.setInterval(send, intervalMs);
    };

    const stop = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const onFocus = () => send();
    const onVisibility = () => {
      if (document.visibilityState === "visible") send();
    };
    const onOnline = () => send();

    start();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);

    return () => {
      stop();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, [intervalMs, immediate, authReady, user?.id]); // ✅ important

  // ping à chaque changement de page (uniquement si connecté)
  useEffect(() => {
    send();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, authReady, user?.id]);

  return null;
}
