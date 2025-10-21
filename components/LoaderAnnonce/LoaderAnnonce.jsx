"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import "./LoaderAnnonce.css";

const LS_LAST_SEEN_KEY = "xp_loader_annonce_last_seen";
const DAY_MS = 86400000;

function hasOneDayPassed() {
  try {
    const lastSeen = localStorage.getItem(LS_LAST_SEEN_KEY);
    if (!lastSeen) return true;
    return Date.now() - parseInt(lastSeen, 10) > DAY_MS;
  } catch {
    return true;
  }
}
function markSeenNow() {
  try {
    localStorage.setItem(LS_LAST_SEEN_KEY, Date.now().toString());
  } catch {}
}

function isActive(a) {
  const on = !!a?.actif;
  const notExpired = !a?.expireAt || new Date(a.expireAt).getTime() >= Date.now();
  return on && notExpired;
}

export default function LoaderAnnonce() {
  const [annonces, setAnnonces] = useState([]);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState(null);

  const contenuRef = useRef(null);
  const abortRef = useRef(null);
  const timerRef = useRef(null);

  // index courant dans la file d'annonces
  const [idx, setIdx] = useState(0);

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
        const text = await res.text();
        const json = text ? JSON.parse(text) : { data: [] };
        const data = Array.isArray(json?.data) ? json.data : [];
        setAnnonces(data);
      } catch (e) {
        if (e?.name !== "AbortError") setError(e.message || "fetch error");
      }
    })();

    return () => controller.abort();
  }, []);

  // File d'annonces à afficher (actives & non expirées)
  const queue = useMemo(() => {
    return (annonces || []).filter(isActive);
  }, [annonces]);

  const current = queue[idx] || null;

  // Démarrage de l’overlay : une fois par jour
  useEffect(() => {
    if (!current) return;
    if (!hasOneDayPassed()) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setVisible(true);

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [current]);

  // Avancer à l’annonce suivante ou fermer si fin
  const closeOrNext = useCallback(() => {
    // Efface le timer courant
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (idx + 1 < queue.length) {
      setIdx((i) => i + 1);
    } else {
      setVisible(false);
      markSeenNow(); // on a montré le “lot” du jour
    }
  }, [idx, queue.length]);

  // Auto-hide par annonce (durée propre)
  useEffect(() => {
    if (!visible || !current) return;
    const autoHideMs = Number.isFinite(current.durationMs) ? current.durationMs : 6000;
    if (autoHideMs > 0) {
      timerRef.current = setTimeout(() => {
        closeOrNext();
      }, autoHideMs);
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [visible, current, closeOrNext]);

  // Click dehors + ESC → passe à la suivante
  useEffect(() => {
    if (!visible) return;

    const onClick = (e) => {
      if (contenuRef.current && !contenuRef.current.contains(e.target)) {
        closeOrNext();
      }
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        closeOrNext();
      }
    };

    window.addEventListener("click", onClick);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [visible, closeOrNext]);

  if (error) return null;
  if (!visible || !current) return null;

  const overlayStyle = {
    backgroundColor: current.overlayColor || "rgba(0,0,0,.6)",
  };
  const boxStyle = {
    background: current.bgColor || "white",
    borderRadius: (current.borderRadiusPx ?? 16) + "px",
    maxWidth: (current.maxWidthPx ?? 520) + "px",
    position: "relative",
  };
  const pStyle = {
    color: current.textColor || "#e0c084",
    fontSize: (current.fontSizePx ?? 36) + "px",
    textAlign: "center",
  };

  return (
    <div className="loader-annonce" style={overlayStyle} role="dialog" aria-modal="true" aria-label="Annonce">
      <div className="loader-contenu fade-in" style={boxStyle} ref={contenuRef}>
        {/* bouton fermer */}
        <button
          aria-label="Fermer l’annonce"
          onClick={closeOrNext}
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
          <strong>{current.titre}</strong>
          <br />
          {current.message}
        </p>

        {/* barre d’actions (facultative) */}
        {queue.length > 1 && (
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
            <small style={{ opacity: 0.7 }}>
              {idx + 1} / {queue.length}
            </small>
            <button
              onClick={closeOrNext}
              className="btn btn-secondary"
              style={{ padding: "6px 10px", borderRadius: 8, cursor: "pointer" }}
            >
              Suivant
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
