// lib/ably.js
import { Realtime } from "ably";

let ablyInstance;

if (!ablyInstance) {
  ablyInstance = new Realtime({
    key: process.env.NEXT_PUBLIC_ABLY_API_KEY,
    autoConnect: true,
    closeOnUnload: false,
    recover: (lastConnectionDetails, callback) => {
      console.log("🔁 Tentative de récupération de session Ably...");
      callback(true); // True = essayer de reprendre
    },
  });

  ablyInstance.connection.on("connected", () => {
    console.log("✅ Ably connecté");
  });

  ablyInstance.connection.on("disconnected", () => {
    console.warn("⚠️ Ably déconnecté");
  });

  ablyInstance.connection.on("suspended", () => {
    console.warn("⏸️ Ably suspendu (réseau lent ou instable)");
  });

  ablyInstance.connection.on("closed", () => {
    console.warn("❌ Ably fermé — reconnexion forcée...");
    ablyInstance.connect(); // Tentative de reconnexion manuelle
  });

  ablyInstance.connection.on("failed", () => {
    console.error("🚫 Connexion Ably échouée");
  });

  // 🔄 Ping régulier pour maintenir la connexion vivante
  setInterval(() => {
    ablyInstance.connection.ping((err, time) => {
      if (err) {
        console.error("❌ Ping Ably échoué :", err);
      } else {
        console.log("✅ Ping Ably :", time, "ms");
      }
    });
  }, 30000); // Toutes les 30s
}

export const ably = ablyInstance;
