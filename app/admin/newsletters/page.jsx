"use client";
import { useState, useMemo } from "react";
import "./admin-newsletter.css";

function buildPreviewHtml(titre, contenu) {
  // On reprend la même logique que dans l'API : \n → <br />
  const safeContent = (contenu || "").replace(/\n/g, "<br />");

  return `
  <!DOCTYPE html>
  <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <title>${titre || "Titre de la newsletter"}</title>
    </head>
    <body style="margin:0;padding:0;background-color:#0b0f14;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0b0f14;padding:20px 0;">
        <tr>
          <td align="center">
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#050711;border-radius:8px;overflow:hidden;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f5f5f5;">
              <tr>
                <td style="padding:24px 32px;border-bottom:1px solid #222633;">
                  <h1 style="margin:0;font-size:24px;color:#ffb048;">${titre || "Titre de la newsletter"}</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:24px 32px;font-size:16px;line-height:1.6;">
                  ${safeContent || "<em>Le contenu de la newsletter apparaîtra ici…</em>"}
                </td>
              </tr>
              <tr>
                <td style="padding:16px 32px;font-size:12px;color:#9ca3af;border-top:1px solid #222633;">
                  Vous recevez cet email parce que vous êtes inscrit·e à la newsletter X-periences.<br />
                  <span style="color:#6b7280;">Vous pouvez vous désabonner depuis votre espace personnel.</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
}

export default function AdminNewsletterPage() {
  const [titre, setTitre] = useState("");
  const [contenu, setContenu] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch("/api/admin/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titre, contenu }),
    });

    const data = await res.json();
    if (data.success) {
      setMessage("✅ Newsletter envoyée !");
      setTitre("");
      setContenu("");
    } else {
      setMessage("❌ Erreur : " + data.error);
    }
  };

  const previewHtml = useMemo(
    () => buildPreviewHtml(titre, contenu),
    [titre, contenu]
  );

  return (
    <div className="admin-newsletter-container">
      <h1>Nouvelle Newsletter</h1>

      <div className="admin-newsletter-layout">
        {/* FORMULAIRE */}
        <form onSubmit={handleSubmit} className="admin-newsletter-form">
          <input
            type="text"
            placeholder="Titre de la newsletter"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            required
          />
          <textarea
            placeholder="Contenu HTML ou texte brut"
            value={contenu}
            onChange={(e) => setContenu(e.target.value)}
            rows={10}
            required
          />
          <button type="submit">Envoyer à tous les abonnés</button>
          {message && (
            <p className="admin-newsletter-message">{message}</p>
          )}
        </form>

        {/* PRÉVISUALISATION */}
        <div className="admin-newsletter-preview">
          <h2>Prévisualisation de l'email</h2>
          <div
            className="admin-newsletter-preview-frame"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>
    </div>
  );
}
