"use client";

import { useEffect, useState } from "react";
import "./LoaderAnnonce.css";

export default function LoaderAnnonce() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const aDejaVu = localStorage.getItem("aVuLoaderAnnonce");

    const maintenant = new Date();
    const limite = new Date("2024-07-17T00:00:00");

    if (true) {
      console.log("Loader visible");
      setVisible(true);
      localStorage.setItem("aVuLoaderAnnonce", "true");

      setTimeout(() => {
        setVisible(false);
      }, 3000);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="loader-annonce">
      <div className="loader-contenu">
        <p className="fade-in">
          🎉 Jusqu'au <strong>16/07</strong>, l'accès au site est <strong>totalement gratuit</strong> !
        </p>
      </div>
    </div>
  );
}
