// components/InstallAppBanner/InstallAppBanner.jsx
"use client";

import { useEffect, useState } from "react";
import styles from "./InstallAppBanner.module.css";

// 🔹 URL Play Store depuis l'ENV ou fallback en dur
const ANDROID_APP_URL =
  process.env.NEXT_PUBLIC_ANDROID_APP_URL ||
  "https://play.google.com/store/apps/details?id=fr.xperiences.app";

const STORAGE_KEY = "xperiences_android_app_banner_dismissed";

function isAndroidMobile() {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent || navigator.vendor || window.opera;

  // 🔹 On simplifie : Android suffit (Chrome mobile l’a toujours)
  const isAndroid = /Android/i.test(ua);

  console.log("[InstallAppBanner] UA =", ua, "isAndroid =", isAndroid);

  return isAndroid;
}

export default function InstallAppBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    console.log("[InstallAppBanner] ANDROID_APP_URL =", ANDROID_APP_URL);

    // ⚠️ Si même le fallback est vide (très improbable), on sort
    if (!ANDROID_APP_URL) {
      console.warn(
        "[InstallAppBanner] Pas d'URL Android définie. Vérifie NEXT_PUBLIC_ANDROID_APP_URL sur Vercel."
      );
      return;
    }

    const alreadyDismissed =
      window.localStorage.getItem(STORAGE_KEY) === "1";

    console.log("[InstallAppBanner] alreadyDismissed =", alreadyDismissed);

    if (alreadyDismissed) return;

    if (isAndroidMobile()) {
      setVisible(true);
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
