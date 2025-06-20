"use client";

import { useEffect } from "react";

export default function ClientWrapper({ children }) {
  useEffect(() => {
    let timer;

    const updateStatut = async (statut, useBeacon = false) => {
      try {
        const resUser = await fetch("/api/utilisateur/statut");
        const dataUser = await resUser.json();

        if (!dataUser?.utilisateur?.statutAuto) return;

        if (useBeacon) {
          console.log("📡 sendBeacon statut :", statut);
          navigator.sendBeacon(
            "/api/utilisateur/statut",
            new Blob([JSON.stringify({ statut })], { type: "application/json" })
          );
          return;
        }

        await fetch("/api/utilisateur/statut", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ statut }),
        });
      } catch (err) {
        console.error("❌ Erreur mise à jour statut :", err);
      }
    };

    const handleVisibilityChange = () => {
      clearTimeout(timer);

      if (document.visibilityState === "hidden") {
        console.log("👁️ Page cachée → HORS_LIGNE dans 15s");
        timer = setTimeout(() => updateStatut("hors_ligne"), 15000);
      } else {
        console.log("👁️ Page visible → EN_LIGNE immédiat");
        updateStatut("en_ligne");
      }
    };

    const handleBeforeUnload = () => {
      console.log("🚪 beforeunload → sendBeacon");
      updateStatut("hors_ligne", true);
    };

    // ➤ Dès le montage
    updateStatut("en_ligne");

    // ➤ Listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("unload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("unload", handleBeforeUnload);
    };
  },
  []);
  useEffect(() => {
  const disableContextMenu = (e) => e.preventDefault();
  document.addEventListener("contextmenu", disableContextMenu);
  return () => {
    document.removeEventListener("contextmenu", disableContextMenu);
  };
}, []);


  return <>{children}</>;
}
