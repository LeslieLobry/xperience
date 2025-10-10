"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "./LoaderAnnonce.css";

const LS_LAST_SEEN_KEY = "xp_loader_annonce_last_seen";

function hasOneDayPassed() {
  try {
    const lastSeen = localStorage.getItem(LS_LAST_SEEN_KEY);
    if (!lastSeen) return true;
    return Date.now() - parseInt(lastSeen, 10) > 86400000; // 24h
  } catch {
    return true;
  }
}
function markSeenNow() {
  try {
    localStorage.setItem(LS_LAST_SEEN_KEY, Date.now().toString());
  } catch {}
}

export default function LoaderAnnonce() {
  const [annonces, setAnnonces] = useState([]);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState(null);
  const contenuRef = useRef(null);
  const abortRef = useRef(null);
  const timerRef = useRef(null);

  // Charger annonces actives côté API
  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      try {
        const res = await fetch("/api/annonces", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) {
          setError(`HTTP ${res.status}`);
          return;
        }
        // certaines erreurs 500 renvoient un body vide → protège le json()
        const text = await res.text();
        const json = text ? JSON.parse(text) : { data: [] };
        setAnnonces(Array.isArray(json?.data) ? json.data : []);
      } catch (e) {
        if (e?.name !== "AbortError") setError(e.message || "fetch error");
      }
    })();

    return () => controller.abort();
  }, []);

  const annonce = useMemo(() => (annonces && annonces[0]) || null, [annonces]);

  // Apparition + handlers
  useEffect(() => {
    if (!annonce) return;

    if (hasOneDayPassed()) {
      setVisible(true);

      // body scroll lock
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const autoHideMs = Number.isFinite(annonce.durationMs)
        ? annonce.durationMs
        : 6000;

      if (autoHideMs > 0) {
        timerRef.current = setTimeout(() => {
          setVisible(false);
          markSeenNow();
        }, autoHideMs);
      }

      // click dehors
      const onClick = (e) => {
        if (contenuRef.current && !contenuRef.current.contains(e.target)) {
          setVisible(false);
          markSeenNow();
        }
      };

      // ESC pour fermer
      const onKeyDown = (e) => {
        if (e.key === "Escape") {
          setVisible(false);
          markSeenNow();
        }
      };

      window.addEventListener("click", onClick);
      window.addEventListener("keydown", onKeyDown);

      return () => {
        clearTimeout(timerRef.current);
        window.removeEventListener("click", onClick);
        window.removeEventListener("keydown", onKeyDown);
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [annonce]);

  if (error) {
    // Optionnel : en prod tu peux retourner null pour ne rien afficher
    return null;
  }
  if (!visible || !annonce) return null;

  const overlayStyle = {
    backgroundColor: annonce.overlayColor || "rgba(0,0,0,.6)",
  };
  const boxStyle = {
    background: annonce.bgColor || "white",
    borderRadius: (annonce.borderRadiusPx ?? 16) + "px",
    maxWidth: (annonce.maxWidthPx ?? 520) + "px",
    position: "relative",
  };
  const pStyle = {
    color: annonce.textColor || "#e0c084",
    fontSize: (annonce.fontSizePx ?? 36) + "px",
    textAlign: "center",
  };

  return (
    <div className="loader-annonce" style={overlayStyle} role="dialog" aria-modal="true" aria-label="Annonce">
      <div className="loader-contenu fade-in" style={boxStyle} ref={contenuRef}>
        {/* bouton fermer (facultatif) */}
        <button
          aria-label="Fermer l’annonce"
          onClick={() => {
            setVisible(false);
            markSeenNow();
          }}
          style={{
            position: "absolute",
            top: 8,
            right: 10,
            border: "none",
            background: "transparent",
            fontSize: 22,
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          ×
        </button>

        <p style={pStyle}>
          <strong>{annonce.titre}</strong>
          <br />
          {annonce.message}
        </p>
      </div>
    </div>
  );
}
