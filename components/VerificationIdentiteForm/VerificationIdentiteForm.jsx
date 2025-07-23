"use client";

import { useState, useEffect } from "react";
import "./VerificationIdentiteForm.css";

export default function VerificationIdentiteForm() {
  const [type, setType] = useState("SIMPLE"); // SIMPLE ou COUPLE
  const [loadingUser, setLoadingUser] = useState(true);
  const [photoCI1, setPhotoCI1] = useState(null);
  const [selfie1, setSelfie1] = useState(null);
  const [photoCI2, setPhotoCI2] = useState(null);
  const [selfie2, setSelfie2] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [acceptConditions, setAcceptConditions] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const data = await res.json();
          const userType = data.user?.type?.toLowerCase();
          setType(userType === "couple" ? "COUPLE" : "SIMPLE");
        } else {
          console.error("Erreur récupération utilisateur");
        }
      } catch (e) {
        console.error("Erreur fetch utilisateur", e);
      } finally {
        setLoadingUser(false);
      }
    }
    fetchUser();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!acceptConditions) {
      setResult({ error: "Vous devez accepter les conditions avant d’envoyer." });
      return;
    }
    setLoading(true);
    setResult(null);

    const form = new FormData();
    form.append("type", type);
    form.append("photoCI1", photoCI1);
    form.append("selfie1", selfie1);
    if (type === "COUPLE") {
      form.append("photoCI2", photoCI2);
      form.append("selfie2", selfie2);
    }

    try {
      const res = await fetch("/api/verification-identite", {
        method: "POST",
        body: form,
      });
      const data = await res.json();

      if (!data.success) {
        setResult({ error: data.message || "Erreur inconnue" });
      } else {
        setResult({ success: "Votre demande a bien été envoyée." });
      }
    } catch (error) {
      setResult({ error: "Erreur lors de l'envoi" });
    }
    setLoading(false);
  }

  if (loadingUser) return <p>Chargement du profil...</p>;

  return (
    <div className="form-verif">
      <form onSubmit={handleSubmit}>
        <p>
          Type de compte détecté : <strong>{type === "COUPLE" ? "Couple" : "Simple"}</strong>
        </p>

        <div style={{ marginBottom: "1em" }}>
          <label>
            <input
              type="checkbox"
              checked={acceptConditions}
              onChange={(e) => setAcceptConditions(e.target.checked)}
              style={{ marginRight: "8px" }}
            />
            Je certifie que mes informations sont exactes et que je respecte les conditions d’utilisation.
            Les photos de carte d’identité sont utilisées uniquement pour la vérification et ne sont pas stockées.
          </label>
        </div>

        <div>
          <label>Carte d'identité membre 1</label>
          <input type="file" accept="image/*,application/pdf" required onChange={(e) => setPhotoCI1(e.target.files[0])} />
        </div>

        <div>
          <label>Selfie membre 1</label>
          <input type="file" accept="image/*" required onChange={(e) => setSelfie1(e.target.files[0])} />
        </div>

        {type === "COUPLE" && (
          <>
            <div>
              <label>Carte d'identité membre 2</label>
              <input type="file" accept="image/*,application/pdf" required onChange={(e) => setPhotoCI2(e.target.files[0])} />
            </div>
            <div>
              <label>Selfie membre 2</label>
              <input type="file" accept="image/*" required onChange={(e) => setSelfie2(e.target.files[0])} />
            </div>
          </>
        )}

        <button type="submit" disabled={loading}>
          {loading ? "Envoi..." : "Envoyer"}
        </button>

        {result && (
          <div style={{ marginTop: 10 }}>
            {result.error && <span style={{ color: "red" }}>{result.error}</span>}
            {result.success && <span style={{ color: "green" }}>{result.success}</span>}
          </div>
        )}
      </form>
    </div>
  );
}
