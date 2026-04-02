"use client";

import { useMemo, useState } from "react";
import { buildBroadcastEmail } from "../../../lib/emails/buildBroadcastEmail";
import "./BroadcastPremiumForm.css";

export default function BroadcastPremiumForm() {
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [title, setTitle] = useState("");
  const [intro, setIntro] = useState("");
  const [message, setMessage] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [signature, setSignature] = useState("L’équipe Xperiences");

  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const previewHtml = useMemo(() => {
    return buildBroadcastEmail({
      subject: subject || "Objet du mail",
      preheader,
      title: title || subject || "Titre principal",
      intro,
      message,
      ctaLabel,
      ctaUrl,
      signature,
    });
  }, [subject, preheader, title, intro, message, ctaLabel, ctaUrl, signature]);

  function resetFeedback() {
    setSuccess("");
    setError("");
  }

  function getPayload() {
    return {
      subject: subject.trim(),
      preheader: preheader.trim(),
      title: title.trim(),
      intro: intro.trim(),
      message: message.trim(),
      ctaLabel: ctaLabel.trim(),
      ctaUrl: ctaUrl.trim(),
      signature: signature.trim(),
    };
  }

  function isValidForm() {
    return Boolean(subject.trim() && message.trim());
  }

  async function sendTest() {
    resetFeedback();

    if (!isValidForm()) {
      setError("Il faut au minimum un objet et un message.");
      return;
    }

    if (!testEmail.trim()) {
      setError("Renseigne une adresse email de test.");
      return;
    }

    try {
      setSendingTest(true);

      const res = await fetch("/api/admin/broadcast/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...getPayload(),
          testEmail: testEmail.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Erreur lors de l'envoi du test.");
      }

      setSuccess(data?.message || "Email de test envoyé.");
    } catch (err) {
      setError(err.message || "Erreur lors de l'envoi du test.");
    } finally {
      setSendingTest(false);
    }
  }

  async function sendAll() {
    resetFeedback();

    if (!isValidForm()) {
      setError("Il faut au minimum un objet et un message.");
      return;
    }

    try {
      setSendingAll(true);

      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(getPayload()),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Erreur lors de l'envoi global.");
      }

      setSuccess(data?.message || "Mail envoyé à tous les utilisateurs.");
    } catch (err) {
      setError(err.message || "Erreur lors de l'envoi global.");
    } finally {
      setSendingAll(false);
    }
  }

  return (
    <div className="broadcastPremiumPage">
      <div className="broadcastPremiumCard">
        <div className="broadcastPremiumLeft">
          <h2 className="broadcastPremiumTitle">Broadcast email premium</h2>

          <div className="broadcastPremiumGrid">
            <div className="broadcastPremiumField">
              <label htmlFor="subject">Objet</label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex : Nouveautés Xperiences"
                maxLength={160}
              />
            </div>

            <div className="broadcastPremiumField">
              <label htmlFor="preheader">Préheader</label>
              <input
                id="preheader"
                type="text"
                value={preheader}
                onChange={(e) => setPreheader(e.target.value)}
                placeholder="Petit texte aperçu dans certaines boîtes mail"
                maxLength={180}
              />
            </div>
          </div>

          <div className="broadcastPremiumField">
            <label htmlFor="title">Titre principal</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Découvrez nos nouveautés"
              maxLength={180}
            />
          </div>

          <div className="broadcastPremiumField">
            <label htmlFor="intro">Introduction</label>
            <textarea
              id="intro"
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              placeholder="Petit texte d’introduction"
              rows={4}
            />
          </div>

          <div className="broadcastPremiumField">
            <label htmlFor="message">Message principal</label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Écris ton message principal ici"
              rows={10}
            />
          </div>

          <div className="broadcastPremiumGrid">
            <div className="broadcastPremiumField">
              <label htmlFor="ctaLabel">Texte du bouton</label>
              <input
                id="ctaLabel"
                type="text"
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                placeholder="Ex : Découvrir"
                maxLength={60}
              />
            </div>

            <div className="broadcastPremiumField">
              <label htmlFor="ctaUrl">Lien du bouton</label>
              <input
                id="ctaUrl"
                type="text"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="https://x-periences.fr/..."
              />
            </div>
          </div>

          <div className="broadcastPremiumField">
            <label htmlFor="signature">Signature</label>
            <input
              id="signature"
              type="text"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="L’équipe Xperiences"
              maxLength={120}
            />
          </div>

          <div className="broadcastPremiumTestBox">
            <div className="broadcastPremiumField">
              <label htmlFor="testEmail">Envoyer un test à</label>
              <input
                id="testEmail"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="ton@email.fr"
              />
            </div>

            <button
              type="button"
              className="broadcastPremiumSecondaryButton"
              onClick={sendTest}
              disabled={sendingTest || sendingAll}
            >
              {sendingTest ? "Envoi du test..." : "Envoyer un test"}
            </button>
          </div>

          <div className="broadcastPremiumActions">
            <button
              type="button"
              className="broadcastPremiumPrimaryButton"
              onClick={sendAll}
              disabled={!isValidForm() || sendingAll || sendingTest}
            >
              {sendingAll ? "Envoi global..." : "Envoyer à tous"}
            </button>
          </div>

          {success ? <p className="broadcastPremiumSuccess">{success}</p> : null}
          {error ? <p className="broadcastPremiumError">{error}</p> : null}
        </div>

        <div className="broadcastPremiumRight">
          <h3 className="broadcastPremiumPreviewTitle">Aperçu réel du mail</h3>
          <div className="broadcastPremiumPreviewFrame">
            <iframe
              title="Aperçu du mail premium"
              srcDoc={previewHtml}
              className="broadcastPremiumIframe"
            />
          </div>
        </div>
      </div>
    </div>
  );
}