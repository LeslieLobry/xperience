"use client";

import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./VerificationIdentiteForm.css";

export default function VerificationIdentiteForm() {
  const [type, setType] = useState("SIMPLE");
  const [loadingUser, setLoadingUser] = useState(true);

  const [photoCI1, setPhotoCI1] = useState(null);
  const [selfie1, setSelfie1] = useState(null);
  const [photoCI2, setPhotoCI2] = useState(null);
  const [selfie2, setSelfie2] = useState(null);

  const [loading, setLoading] = useState(false);
  const [acceptConditions, setAcceptConditions] = useState(false);

  // ✅ Statut réel
  const [statut, setStatut] = useState("AUCUNE"); // AUCUNE | EN_ATTENTE | ACCEPTEE | REFUSEE

  // ✅ Pour reset les <input type="file" />
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    async function fetchInfos() {
      try {
        const resUser = await fetch("/api/me", { credentials: "include" });
        if (resUser.ok) {
          const data = await resUser.json();
          const userType = data.user?.type?.toLowerCase();
          setType(userType === "couple" ? "COUPLE" : "SIMPLE");
        }

        const resStatut = await fetch("/api/verification-identite/statut", {
          credentials: "include",
        });

        if (resStatut.ok) {
          const dataStatut = await resStatut.json();
          if (dataStatut?.success) {
            setStatut(dataStatut.statut || "AUCUNE");
          }
        }
      } catch (e) {
        console.error("Erreur lors du chargement des infos :", e);
      } finally {
        setLoadingUser(false);
      }
    }

    fetchInfos();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();

    if (statut === "EN_ATTENTE") {
      toast.info("⏳ Votre demande est déjà en cours de traitement.");
      return;
    }
    if (statut === "ACCEPTEE") {
      toast.info("✅ Votre profil est déjà vérifié.");
      return;
    }

    if (!acceptConditions) {
      toast.error("❌ Vous devez accepter les conditions avant d’envoyer.");
      return;
    }

    if (!photoCI1 || !selfie1) {
      toast.error("❌ Merci d'ajouter la carte d'identité et le selfie (membre 1).");
      return;
    }
    if (type === "COUPLE" && (!photoCI2 || !selfie2)) {
      toast.error("❌ Merci d'ajouter la carte d'identité et le selfie (membre 2).");
      return;
    }

    setLoading(true);

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
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success) {
        toast.error(data?.message || "❌ Une erreur est survenue.");
        setLoading(false);
        return;
      }

      toast.success("✅ Votre demande a bien été envoyée. Elle est en cours de traitement.");

      // ✅ UI => en attente
      setStatut("EN_ATTENTE");

      // ✅ reset states
      setPhotoCI1(null);
      setSelfie1(null);
      setPhotoCI2(null);
      setSelfie2(null);
      setAcceptConditions(false);

      // ✅ reset inputs file visuellement
      setFormKey((k) => k + 1);
    } catch (error) {
      toast.error("❌ Erreur lors de l'envoi.");
    }

    setLoading(false);
  }

  if (loadingUser) return <p>Chargement du profil...</p>;

  if (statut === "EN_ATTENTE") {
    return (
      <div className="form-verif">
        <p style={{ color: "#e0c084", fontWeight: "bold" }}>
          ⏳ Votre demande de vérification est en cours de traitement.
        </p>
      </div>
    );
  }

  if (statut === "ACCEPTEE") {
    return (
      <div className="form-verif">
        <p style={{ color: "green", fontWeight: "bold" }}>
          ✅ Votre profil est déjà vérifié.
        </p>
      </div>
    );
  }

  const showRefusedBanner = statut === "REFUSEE";

  return (
    <div className="form-verif">
      {showRefusedBanner && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ color: "#ff6b6b", fontWeight: "bold" }}>
            ❌ Votre précédente demande a été refusée.
          </p>
          <p style={{ color: "rgba(255,255,255,0.8)" }}>
            Vous pouvez renvoyer des documents plus lisibles / conformes.
          </p>
        </div>
      )}

      <form key={formKey} onSubmit={handleSubmit}>
        <p>
          Type de compte détecté :{" "}
          <strong>{type === "COUPLE" ? "Couple" : "Simple"}</strong>
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
          <input
            type="file"
            accept="image/*,application/pdf"
            required
            onChange={(e) => setPhotoCI1(e.target.files?.[0] || null)}
          />
        </div>

        <div>
          <label>Selfie membre 1</label>
          <input
            type="file"
            accept="image/*"
            required
            onChange={(e) => setSelfie1(e.target.files?.[0] || null)}
          />
        </div>

        {type === "COUPLE" && (
          <>
            <div>
              <label>Carte d'identité membre 2</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                required
                onChange={(e) => setPhotoCI2(e.target.files?.[0] || null)}
              />
            </div>
            <div>
              <label>Selfie membre 2</label>
              <input
                type="file"
                accept="image/*"
                required
                onChange={(e) => setSelfie2(e.target.files?.[0] || null)}
              />
            </div>
          </>
        )}

        <button type="submit" disabled={loading}>
          {loading ? "Envoi..." : "Envoyer"}
        </button>
      </form>
    </div>
  );
}