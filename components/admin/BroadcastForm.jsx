"use client"

import { useState } from "react";

// Variables de couleurs (adapte à ta charte)
const COLORS = {
  primary: "#112347",       // Bleu nuit
  accent: "#e0c084",        // Bleu turquoise accent
  bg: "#181f32",            // Fond global sombre
  card: "#232f47",          // Fond des cards
  border: "#283356",
  text: "#f6f6fb",
  muted: "#a7adc8",
  button: "#e0c084",
  buttonHover: "#15a3b0",
  error: "#ef5350",
  success: "#48eaa6",
};

const LOGO_URL = "https://x-periences.fr/logo.png"; 

export default function BroadcastForm() {
  const [objet, setObjet] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    setSending(true);
    setError("");
    setSuccess(false);
    const res = await fetch("/api/admin/broadcast", {
      method: "POST",
      body: JSON.stringify({ objet, message }),
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) setSuccess(true);
    else setError("Erreur lors de l'envoi !");
    setSending(false);
  };

  return (
    <div style={{
      maxWidth: 1050,
      margin: "40px auto",
      padding: 24,
      background: COLORS.bg,
      color: COLORS.text,
      borderRadius: 16,
      boxShadow: "0 8px 24px rgba(20,30,60,0.18)",
      display: "flex",
      gap: 32,
      fontFamily: "inherit"
    }}>
      {/* Formulaire */}
      <div style={{ flex: 1, minWidth: 320 }}>
        <h2 style={{ color: COLORS.accent, fontWeight: 700, fontSize: 24, marginBottom: 24 }}>
          Envoyer un mail général à tous
        </h2>
        <label style={{ color: COLORS.muted, fontWeight: 600 }}>Objet du mail</label>
        <input
          type="text"
          value={objet}
          onChange={e => setObjet(e.target.value)}
          placeholder="Objet du mail"
          style={{
            width: "100%",
            marginBottom: 18,
            marginTop: 6,
            padding: "10px 14px",
            borderRadius: 8,
            border: `1px solid ${COLORS.border}`,
            background: COLORS.card,
            color: COLORS.text,
            fontSize: 16,
            outline: "none"
          }}
        />
        <label style={{ color: COLORS.muted, fontWeight: 600 }}>Message</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Message (HTML possible)"
          rows={10}
          style={{
            width: "100%",
            marginBottom: 18,
            marginTop: 6,
            padding: "10px 14px",
            borderRadius: 8,
            border: `1px solid ${COLORS.border}`,
            background: COLORS.card,
            color: COLORS.text,
            fontSize: 15,
            fontFamily: "inherit",
            outline: "none",
            resize: "vertical"
          }}
        />
        <button
          onClick={send}
          disabled={sending || !objet || !message}
          style={{
            background: COLORS.button,
            color: "#fff",
            fontWeight: 700,
            padding: "12px 30px",
            border: "none",
            borderRadius: 8,
            fontSize: 16,
            cursor: sending || !objet || !message ? "not-allowed" : "pointer",
            boxShadow: "0 2px 10px rgba(32,180,199,0.09)",
            transition: "background 0.18s"
          }}
          onMouseOver={e => e.currentTarget.style.background = COLORS.buttonHover}
          onMouseOut={e => e.currentTarget.style.background = COLORS.button}
        >
          {sending ? "Envoi en cours..." : "Envoyer à tous"}
        </button>
        {success && <p style={{ color: COLORS.success, fontWeight: 600, marginTop: 16 }}>Mail envoyé à tous les utilisateurs !</p>}
        {error && <p style={{ color: COLORS.error, fontWeight: 600, marginTop: 16 }}>{error}</p>}
      </div>
      {/* Aperçu du mail */}
      <div style={{
        flex: 1,
        background: COLORS.card,
        borderRadius: 12,
        border: `1px solid ${COLORS.border}`,
        boxShadow: "0 2px 10px rgba(30,60,90,0.08)",
        padding: 24,
        minHeight: 260,
        color: COLORS.text
      }}>
        <h3 style={{ color: COLORS.accent, margin: "0 0 18px 0", fontSize: 20 }}>Aperçu du mail</h3>
        <div style={{
          border: `1px solid ${COLORS.border}`,
          borderRadius: 8,
          background: "#222c45",
          padding: 16,
          minHeight: 170,
        }}>
          <h4 style={{ margin: "0 0 12px 0", color: COLORS.text, fontWeight: 700 }}>
            {objet || <span style={{ color: COLORS.muted }}>Objet du mail…</span>}
          </h4>
          {/* Affiche le message en HTML + le logo à la fin */}
          <div
            dangerouslySetInnerHTML={{
              __html:
                (message || "<i style='color:#a7adc8;'>(Votre message ici)</i>") +
                `<div style='text-align:center;margin-top:32px;'>
                  <img src="${LOGO_URL}" alt="Logo X-periences" style="height:48px;opacity:0.92;" />
                </div>`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
