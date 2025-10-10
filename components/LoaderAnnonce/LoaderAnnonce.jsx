// components/LoaderAnnonce.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "./LoaderAnnonce.css";

const LS_LAST_SEEN_KEY = "xp_loader_annonce_last_seen";

function hasOneDayPassed() {
  const lastSeen = localStorage.getItem(LS_LAST_SEEN_KEY);
  if (!lastSeen) return true;
  return Date.now() - parseInt(lastSeen, 10) > 86400000;
}
function markSeenNow() {
  localStorage.setItem(LS_LAST_SEEN_KEY, Date.now().toString());
}

export default function LoaderAnnonce({ autoHideMs = 6000 }) {
  const [annonces, setAnnonces] = useState([]);
  const [visible, setVisible] = useState(false);
  const contenuRef = useRef(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/annonces", { cache: "no-store" });
      const json = await res.json();
      setAnnonces(json?.data || []);
    })();
  }, []);

  const annonce = useMemo(() => (annonces && annonces[0]) || null, [annonces]);

  useEffect(() => {
    if (!annonce) return;
    if (hasOneDayPassed()) {
      setVisible(true);
      const t = setTimeout(() => {
        setVisible(false);
        markSeenNow();
      }, autoHideMs);

      const onClick = (e) => {
        if (contenuRef.current && !contenuRef.current.contains(e.target)) {
          setVisible(false);
          markSeenNow();
        }
      };
      window.addEventListener("click", onClick);
      return () => {
        clearTimeout(t);
        window.removeEventListener("click", onClick);
      };
    }
  }, [annonce, autoHideMs]);

  if (!visible || !annonce) return null;

  return (
    <div className="loader-annonce">
      <div className="loader-contenu fade-in" ref={contenuRef}>
        <p>
          <strong>{annonce.titre}</strong>
          <br />
          {annonce.message}
        </p>
      </div>
    </div>
  );
}
