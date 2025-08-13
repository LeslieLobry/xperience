"use client";

import { useEffect, useRef, useState } from "react";
import "./LoaderAnnonce.css";

function hasOneDayPassed() {
  const lastSeen = localStorage.getItem("xp_loader_annonce_last_seen");
  if (!lastSeen) return true;
  const now = Date.now();
  // 24h = 86400_000 ms
  return now - parseInt(lastSeen, 10) > 86400000;
}

export default function LoaderAnnonce() {
  const [visible, setVisible] = useState(false);
  const contenuRef = useRef(null);

  useEffect(() => {
    if (hasOneDayPassed()) {
      setVisible(true);

      // Disparition auto après 3s
      const timer = setTimeout(() => {
        setVisible(false);
        localStorage.setItem("xp_loader_annonce_last_seen", Date.now().toString());
      }, 6000);

      // Clic dehors = fermeture
      const handleClick = (e) => {
        if (contenuRef.current && !contenuRef.current.contains(e.target)) {
          setVisible(false);
          localStorage.setItem("xp_loader_annonce_last_seen", Date.now().toString());
        }
      };
      window.addEventListener("click", handleClick);

      return () => {
        clearTimeout(timer);
        window.removeEventListener("click", handleClick);
      };
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="loader-annonce">
      <div className="loader-contenu" ref={contenuRef}>
        <p className="fade-in">
          🎉 Jusqu'au <strong>16/09</strong>, l'accès au site est <strong>totalement gratuit</strong> !
        </p>
      </div>
    </div>
  );
}
