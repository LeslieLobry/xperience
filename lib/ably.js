// lib/ably.js
import { Realtime } from "ably";

const isBrowser = typeof window !== "undefined";
const globalForAbly = globalThis;

export function getAbly() {
  if (!isBrowser) return null;

  if (!globalForAbly.__ablyRealtime) {
    globalForAbly.__ablyRealtime = new Realtime({
      authUrl: "/api/presence/token",
      authMethod: "POST", // ✅ plus fiable que GET
      authHeaders: { "Content-Type": "application/json" },

      // ✅ indispensable si ton auth dépend d'un cookie (getUserFromToken)
      withCredentials: true,

      echoMessages: false,
      autoConnect: true,
      closeOnUnload: true, // ✅ évite les "online fantômes" à la fermeture onglet
    });

    const ably = globalForAbly.__ablyRealtime;

    // ✅ log unique et complet
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

// compat avec ton code actuel
export const ably = isBrowser ? getAbly() : null;
