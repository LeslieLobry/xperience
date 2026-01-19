// lib/ably.js
import { Realtime } from "ably";

const isBrowser = typeof window !== "undefined";
const globalForAbly = globalThis;

export function getAbly() {
  if (!isBrowser) return null;

  if (!globalForAbly.__ablyRealtime) {
    const rt = new Realtime({
      authUrl: "/api/presence/token",
      authMethod: "POST",
      authHeaders: { "Content-Type": "application/json" },
      withCredentials: true,
      echoMessages: false,
      autoConnect: true,

      // ✅ évite les effets "je pars/je reviens" trop agressifs en SPA
      closeOnUnload: false,
    });

    globalForAbly.__ablyRealtime = rt;

    // logs connexion
    rt.connection.on((stateChange) => {
      console.log("[Ably] conn:", stateChange.current, {
        connectionId: rt.connection.id || null,
        clientId: rt.auth?.clientId || null,
        reason: stateChange.reason?.message || null,
      });
    });

    // logs auth
    rt.auth.on("update", () => {
      console.log("[Ably] auth:update", {
        clientId: rt.auth?.clientId || null,
      });
    });

    // logs erreurs globales
    rt.connection.on("failed", (st) => {
      console.log("[Ably] FAILED", st?.reason?.message || st?.reason || null);
    });
  }

  return globalForAbly.__ablyRealtime;
}

/**
 * ✅ À appeler au logout (ou quand tu changes d'utilisateur)
 * pour éviter de garder un clientId/token de l'ancien compte.
 */
export function resetAbly() {
  if (!isBrowser) return;
  const rt = globalForAbly.__ablyRealtime;
  if (!rt) return;

  try {
    rt.close();
  } catch {}
  try {
    delete globalForAbly.__ablyRealtime;
  } catch {
    globalForAbly.__ablyRealtime = null;
  }
}
