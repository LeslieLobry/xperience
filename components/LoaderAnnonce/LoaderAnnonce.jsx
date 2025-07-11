"use client";

import { useEffect, useRef, useState } from "react";
import "./LoaderAnnonce.css";

export default function LoaderAnnonce() {
  const [visible, setVisible] = useState(true);
  const contenuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (contenuRef.current && !contenuRef.current.contains(e.target)) {
        setVisible(false);
      }
    };

    if (visible) {
      window.addEventListener("click", handleClick);
    }

    return () => {
      window.removeEventListener("click", handleClick);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="loader-annonce">
      <div className="loader-contenu" ref={contenuRef}>
        <p className="fade-in">
          🎉 Jusqu'au <strong>16/08</strong>, l'accès au site est <strong>totalement gratuit</strong> !
        </p>
      </div>
    </div>
  );
}
