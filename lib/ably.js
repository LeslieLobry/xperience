// lib/ably.js
import { Realtime } from "ably";

const isBrowser = typeof window !== "undefined";

// Singleton global (évite les doublons en dev avec HMR)
const globalForAbly = globalThis;

if (!globalForAbly.__ablyRealtime && isBrowser) {
  // ⚠️ Idéalement: authUrl + token (pas de NEXT_PUBLIC_ABLY_API_KEY)
  globalForAbly.__ablyRealtime = new Realtime({
    authUrl: "/api/presence/token",
authMethod: "GET",
echoMessages: false,

    autoConnect: true,
    closeOnUnload: true, // ✅ évite les "online fantômes" à la fermeture onglet
    // recover: ... (optionnel, mais pas obligatoire)
  });

  const ably = globalForAbly.__ablyRealtime;

ably.connection.on("connected", () => {
  console.log("✅ Ably connecté", {
    connectionId: ably.connection.id,
    state: ably.connection.state,
    clientId: ably.auth?.clientId || null,
  });
});


  ably.connection.on("disconnected", () => {
    console.warn("⚠️ Ably déconnecté");
  });

  ably.connection.on("suspended", () => {
    console.warn("⏸️ Ably suspendu (réseau instable)");
  });

  ably.connection.on("failed", (stateChange) => {
    console.error("🚫 Ably failed", stateChange?.reason);
  });

  ably.connection.on("closed", () => {
    console.warn("❌ Ably fermé");
    // ✅ NE PAS forcer connect ici (ça peut créer des boucles)
  });
}

export const ably = globalThis.__ablyRealtime;
