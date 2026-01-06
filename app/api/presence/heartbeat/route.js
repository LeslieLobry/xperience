"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function HeartbeatClient({
  intervalMs = 60_000, // ping toutes les 60s
  immediate = true, // ping au montage
} = {}) {
  const pathname = usePathname();
  const timerRef = useRef(null);

  const send = () => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    fetch("/api/me/heartbeat", {
      method: "POST",
      credentials: "include", // ✅ IMPORTANT
      cache: "no-store",
    }).catch(() => {});
  };

  useEffect(() => {
    let disposed = false;

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
      if (disposed) return;
      disposed = true;
      stop();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, [intervalMs, immediate]);

  useEffect(() => {
    send();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
