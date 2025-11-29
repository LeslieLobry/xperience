// components/InstallAppBanner/InstallAppBanner.jsx
"use client";

import { useEffect, useState } from "react";
import styles from "./InstallAppBanner.module.css";

const ANDROID_APP_URL =
  process.env.NEXT_PUBLIC_ANDROID_APP_URL ||
  "https://play.google.com/store/apps/details?id=fr.xperiences.app";

// On stocke la date de fermeture en ms
const STORAGE_KEY = "xperiences_android_app_banner_dismissed_ts";
// Durée pendant laquelle on cache la bannière (1h ici)
const DISMISS_DURATION_MS = 60 * 60 * 1000; // 1 heure

function isAndroidMobile() {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent || navigator.vendor || window.opera;
  const isAndroid = /Android/i.test(ua);

  console.log("[InstallAppBanner] UA =", ua, "isAndroid =", isAndroid);

  return isAndroid;
}

export default function InstallAppBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    console.log("[InstallAppBanner] ANDROID_APP_URL =", ANDROID_APP_URL);

    if (!ANDROID_APP_URL) {
      console.warn(
        "[InstallAppBanner] Pas d'URL Android définie. Vérifie NEXT_PUBLIC_ANDROID_APP_URL sur Vercel."
      );
      return;
    }

    // 🔹 Vérifie si la bannière a été fermée récemment
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const lastDismiss = Number(raw);
      if (!Number.isNaN(lastDismiss)) {
        const elapsed = Date.now() - lastDismiss;
        console.log("[InstallAppBanner] elapsed since dismiss (ms) =", elapsed);
        // Si < 1h -> on ne montre pas
        if (elapsed < DISMISS_DURATION_MS) {
          return;
        }
      }
    }

    // 🔹 On n'affiche que sur Android
    if (isAndroidMobile()) {
      setVisible(true);
    }
  }, []);

  const handleClose = () => {
    setVisible(false);
    if (typeof window !== "undefined") {
      // ⏱️ On enregistre le moment de fermeture
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
      console.log("[InstallAppBanner] bannière fermée, timestamp enregistré.");
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
