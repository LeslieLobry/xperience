import { useEffect, useRef, useState } from "react";
import "./MessageEphemere.css";

export default function MessageEphemere({ msg, onDelete, utilisateurId }) {
  const [open, setOpen] = useState(false);
  const [timer, setTimer] = useState(5);
  const intervalRef = useRef(null);

  // Prend en compte auteurId et envoyeur (si couple)
  const isEnvoyeur = 
    String(utilisateurId) === String(msg.auteurId) || 
    String(utilisateurId) === String(msg.envoyeur);

  useEffect(() => {
    console.log("utilisateurId:", utilisateurId, "msg.auteurId:", msg.auteurId, "msg.envoyeur:", msg.envoyeur, "isEnvoyeur:", isEnvoyeur);
  }, [utilisateurId, msg.auteurId, msg.envoyeur]);

  useEffect(() => {
    if (open && !isEnvoyeur) {
      setTimer(5);
      intervalRef.current = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            clearInterval(intervalRef.current);
            setOpen(false);
            fetch(`/api/messages/${msg.id}/open`, { method: "PATCH" })
              .then((res) => {
                if (!res.ok) throw new Error("Erreur suppression message");
                onDelete && onDelete(msg.id);
              })
              .catch((err) => {
                console.error("Erreur suppression message éphémère :", err);
              });
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [open, msg.id, onDelete, isEnvoyeur]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (isEnvoyeur) {
    return (
      <div
        className="ephemere-already-opened"
        style={{ opacity: 0.6, userSelect: "none", cursor: "default" }}
        aria-label="Photo éphémère envoyée"
        role="img"
      >
        Photo éphémère envoyée 👁️
      </div>
    );
  }

  if (!open) {
    return (
      <button
        className="ephemere-preview"
        aria-label="Voir la photo éphémère"
        onClick={() => setOpen(true)}
        type="button"
      >
        <span className="ephemere-eye" aria-hidden="true">👁️</span>
        <span className="ephemere-label">Photo éphémère reçue</span>
      </button>
    );
  }

  return (
    <div className="ephemere-modal" role="dialog" aria-modal="true" aria-label="Photo éphémère">
      <div className="ephemere-modal-bg" />
      <div className="ephemere-modal-content">
        <img
          src={msg.imageUrl || "https://i.postimg.cc/JzJj4jpb/marionlogo.jpg"}
          alt="Photo éphémère"
          className="ephemere-image"
        />
        <div className="ephemere-timer-wrapper" aria-live="polite" aria-atomic="true">
          <svg className="ephemere-timer-svg" viewBox="0 0 36 36">
            <circle
              className="ephemere-timer-bg"
              cx="18"
              cy="18"
              r="16"
              fill="none"
              stroke="#222"
              strokeWidth="4"
            />
            <circle
              className="ephemere-timer-circle"
              cx="18"
              cy="18"
              r="16"
              fill="none"
              stroke="#4ee04e"
              strokeWidth="4"
              strokeDasharray={100}
              strokeDashoffset={(100 * (timer / 5)).toFixed(1)}
            />
          </svg>
          <span className="ephemere-timer-number">{timer}</span>
        </div>
        <div className="ephemere-infos">La photo s’efface dans {timer} s…</div>
      </div>
    </div>
  );
}
