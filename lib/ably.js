// lib/ably.js
import { Realtime } from "ably";

const isBrowser = typeof window !== "undefined";
const globalForAbly = globalThis;

export function getAbly() {
  if (!isBrowser) return null;

  if (!globalForAbly.__ablyRealtime) {
    globalForAbly.__ablyRealtime = new Realtime({
      authUrl: "/api/presence/token",
      authMethod: "POST",
      authHeaders: { "Content-Type": "application/json" },
      withCredentials: true,

      echoMessages: false,
      autoConnect: true,
      closeOnUnload: true,
    });

    const ably = globalForAbly.__ablyRealtime;

    // ✅ connexion
    ably.connection.on((stateChange) => {
      console.log("[Ably] conn:", stateChange.current, {
        connectionId: ably.connection.id || null,
        clientId: ably.auth?.clientId || null,
        reason: stateChange.reason?.message || null,
      });
    });

    // ✅ auth (hyper utile pour voir si Ably redemande des tokens / loop / 401)
    ably.auth.on((authStateChange) => {
      console.log("[Ably] auth:", authStateChange);
    });

    // ✅ états réseau problématiques (sinon tu crois que c'est la présence)
    ably.connection.on("suspended", (sc) => {
      console.warn("[Ably] suspended:", sc?.reason?.message || sc?.reason || null);
    });
    ably.connection.on("failed", (sc) => {
      console.error("[Ably] failed:", sc?.reason?.message || sc?.reason || null);
    });
  }

  return globalForAbly.__ablyRealtime;
}

export const ably = isBrowser ? getAbly() : null;
