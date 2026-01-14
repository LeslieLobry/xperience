// lib/ably.js
import { Realtime } from "ably";

const isBrowser = typeof window !== "undefined";
const globalForAbly = globalThis;

export function getAbly() {
  if (!isBrowser) return null;

  if (!globalForAbly.__ablyRealtime) {
    globalForAbly.__ablyRealtime = new Realtime({
      authUrl: "/api/presence/token",
      authMethod: "GET", // ✅ match avec route (et cookies same-origin ok)

      echoMessages: false,
      autoConnect: true,
      closeOnUnload: true,
    });

    const ably = globalForAbly.__ablyRealtime;

    // log unique
    ably.connection.on((stateChange) => {
      console.log("[Ably] conn:", stateChange.current, {
        connectionId: ably.connection.id || null,
        clientId: ably.auth?.clientId || null,
        reason: stateChange.reason?.message || null,
      });
    });
  }

  return globalForAbly.__ablyRealtime;
}

// compat si tu as encore des imports { ably }
export const ably = isBrowser ? getAbly() : null;
