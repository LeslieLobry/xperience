"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function HeartbeatClient({
  intervalMs = 60_000,
  immediate = true,
} = {}) {
  const pathname = usePathname();
  const timerRef = useRef(null);

  const send = () => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    fetch("/api/me/heartbeat", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    }).catch(() => {});
  };

  useEffect(() => {
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
  }, [intervalMs, immediate]);

  // ping à chaque changement de page
  useEffect(() => {
    send();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
