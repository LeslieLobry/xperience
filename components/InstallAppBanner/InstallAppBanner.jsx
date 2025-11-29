// components/InstallAppBanner/InstallAppBanner.jsx
"use client";

import { useEffect, useState } from "react";
import styles from "./InstallAppBanner.module.css";

const ANDROID_APP_URL =
  process.env.NEXT_PUBLIC_ANDROID_APP_URL ||
  "https://play.google.com/store/apps/details?id=fr.xperiences.app";

// 🔹 on change la clé pour ignorer les anciens "fermés"
const STORAGE_KEY = "xperiences_android_app_banner_dismissed_v2";

export default function InstallAppBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    console.log("[InstallAppBanner DEBUG] mount, url =", ANDROID_APP_URL);

    // 🔥 DEBUG : on ignore complètement Android / iPhone et on reset l'ancienne valeur
    window.localStorage.removeItem("xperiences_android_app_banner_dismissed");

    const alreadyDismissed =
      window.localStorage.getItem(STORAGE_KEY) === "1";
    console.log("[InstallAppBanner DEBUG] alreadyDismissed =", alreadyDismissed);

    if (!alreadyDismissed) {
      setVisible(true); // ⬅️ on l'affiche TOUJOURS
    }
  }, []);

  const handleClose = () => {
    setVisible(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "1");
      console.log("[InstallAppBanner] bannière fermée, flag enregistré.");
    }
  };

  if (!visible) return null;

  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <div className={styles.textBlock}>
          <span className={styles.title}>Télécharge l’app X-périences</span>
          <span className={styles.subtitle}>
            Pour une expérience plus fluide sur Android.
          </span>
        </div>

        <a
          href={ANDROID_APP_URL}
          className={styles.button}
          target="_blank"
          rel="noopener noreferrer"
        >
          Télécharger
        </a>

        <button
          type="button"
          className={styles.close}
          onClick={handleClose}
          aria-label="Fermer"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
