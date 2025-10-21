"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function HeartbeatClient({
  intervalMs = 60_000,   // ping toutes les 60s
  immediate = true,      // ping au montage
} = {}) {
  const pathname = usePathname();
  const timerRef = useRef(null);

  // Envoi du heartbeat (protégé contre erreurs)
  const send = () => {
    // onglet actif + visible uniquement
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    // navigator.onLine -> évite les pings offline
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    fetch("/api/me/heartbeat", { method: "POST" }).catch(() => {});
  };

  useEffect(() => {
    let disposed = false;

    const start = () => {
      if (immediate) send();
      // boucle interval
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

  // Ping aussi quand on change de page (bonne heuristique d’activité)
  useEffect(() => {
    send();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
