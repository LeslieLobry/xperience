// components/VerifyClient/VerifyClient.jsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function VerifyClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState("pending"); // pending | success | error
  const [message, setMessage] = useState("Vérification en cours...");

  useEffect(() => {
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    if (!token || !email) {
      setStatus("error");
      setMessage("Lien invalide : paramètres manquants.");
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`, {
          method: "GET",
          cache: "no-store",
        });
        const data = await res.json();

        if (res.ok && data.success) {
          setStatus("success");
          setMessage("Votre email a bien été vérifié ✅");
          // Redirection douce après 3 secondes
          setTimeout(() => router.push("/connexion"), 3000);
        } else {
          setStatus("error");
          setMessage(data.message || "Lien invalide ou expiré.");
        }
      } catch (e) {
        console.error(e);
        setStatus("error");
        setMessage("Une erreur est survenue. Réessayez plus tard.");
      }
    })();
  }, [searchParams, router]);

  return (
    <div style={{ maxWidth: 560, margin: "60px auto", textAlign: "center", lineHeight: 1.6 }}>
      <h1 style={{ fontSize: 28, marginBottom: 10 }}>
        {status === "success"
          ? "✅ Vérification réussie"
          : status === "error"
          ? "❌ Erreur"
          : "⏳ Vérification"}
      </h1>
      <p style={{ marginBottom: 20 }}>{message}</p>
      {status !== "pending" && (
        <a href="/connexion" style={{ textDecoration: "underline" }}>
          Retour à la connexion
        </a>
      )}
    </div>
  );
}
