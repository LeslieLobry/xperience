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
        timer = setTimeout(() => updateStatut("hors_ligne"), 15000);
      } else {
        updateStatut("en_ligne");
      }
    };

    const handlePageHide = () => {
      updateStatut("hors_ligne", true);
    };

    updateStatut("en_ligne");

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

  // ✅ FIX iPhone Safari clavier: calcule la "vraie" hauteur visible
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    const vv = window.visualViewport;

    const apply = () => {
      const vh = vv?.height || window.innerHeight;
      root.style.setProperty("--app-vh", `${vh}px`);

      // keyboard height (approx) = innerHeight - visualViewport.height (quand clavier ouvert)
      const kb = vv ? Math.max(0, window.innerHeight - vv.height - (vv.offsetTop || 0)) : 0;
      root.style.setProperty("--kb", `${kb}px`);
    };

    apply();

    if (vv) {
      vv.addEventListener("resize", apply);
      vv.addEventListener("scroll", apply);
    }
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);

    return () => {
      if (vv) {
        vv.removeEventListener("resize", apply);
        vv.removeEventListener("scroll", apply);
      }
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
    };
  }, []);

  return <>{children}</>;
}
