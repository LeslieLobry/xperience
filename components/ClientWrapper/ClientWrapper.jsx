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

    const handlePageHide = () => {
      console.log("🚪 pagehide → sendBeacon");
      updateStatut("hors_ligne", true);
    };

    // ➤ Dès le montage
    updateStatut("en_ligne");

    // ➤ Listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, []);

  useEffect(() => {
    const disableContextMenu = (e) => e.preventDefault();
    document.addEventListener("contextmenu", disableContextMenu);
    return () => {
      document.removeEventListener("contextmenu", disableContextMenu);
    };
  }, []);

  // ✅ FIX iPhone Safari clavier: variable CSS --app-vh basée sur visualViewport
  useEffect(() => {
    if (typeof window === "undefined") return;

    const vv = window.visualViewport;

    const setVh = () => {
      const h = vv?.height || window.innerHeight;
      document.documentElement.style.setProperty("--app-vh", `${h}px`);
    };

    setVh();

    vv?.addEventListener("resize", setVh);
    vv?.addEventListener("scroll", setVh); // ✅ important iOS
    window.addEventListener("resize", setVh);
    window.addEventListener("focusin", setVh);
    window.addEventListener("focusout", setVh);

    return () => {
      vv?.removeEventListener("resize", setVh);
      vv?.removeEventListener("scroll", setVh);
      window.removeEventListener("resize", setVh);
      window.removeEventListener("focusin", setVh);
      window.removeEventListener("focusout", setVh);
    };
  }, []);

  return <>{children}</>;
}
