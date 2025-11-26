"use client";

import { useEffect, useState } from "react";
import styles from "./InstallAppBanner.module.css";

const ANDROID_APP_URL = process.env.NEXT_PUBLIC_ANDROID_APP_URL;
const STORAGE_KEY = "xperiences_android_app_banner_dismissed";

function isAndroidMobile() {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent || navigator.vendor || window.opera;
  const isAndroid = /Android/i.test(ua);
  const isMobile = /Mobile/i.test(ua); // évite les tablettes / TV

  return isAndroid && isMobile;
}

export default function InstallAppBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ANDROID_APP_URL) return; // pas d’URL ⇒ pas de bannière

    const alreadyDismissed =
      typeof window !== "undefined" &&
      window.localStorage.getItem(STORAGE_KEY) === "1";

    if (alreadyDismissed) return;

    if (isAndroidMobile()) {
      setVisible(true);
    }
  }, []);

  const handleClose = () => {
    setVisible(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "1");
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
