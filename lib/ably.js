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

    // logs connexion
    ably.connection.on((stateChange) => {
      console.log("[Ably] conn:", stateChange.current, {
        connectionId: ably.connection.id || null,
        clientId: ably.auth?.clientId || null,
        reason: stateChange.reason?.message || null,
      });
    });

    // logs auth
    ably.auth.on("update", () => {
      console.log("[Ably] auth:update", {
        clientId: ably.auth?.clientId || null,
      });
    });

    // logs erreurs globales
    ably.connection.on("failed", (st) => {
      console.log("[Ably] FAILED", st?.reason?.message || st?.reason || null);
    });
  }

  return globalForAbly.__ablyRealtime;
}

export const ably = isBrowser ? getAbly() : null;
