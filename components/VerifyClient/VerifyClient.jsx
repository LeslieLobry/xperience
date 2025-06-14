"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const router = useRouter();
  const [status, setStatus] = useState("pending");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token || !email) {
      setStatus("error");
      setMessage("Lien invalide ou incomplet.");
      return;
    }

    const verifyEmail = async () => {
      try {
        const res = await fetch(`/api/verify-email?token=${token}&email=${email}`);
        const data = await res.json();

        if (data.success) {
          setStatus("success");
          setMessage("votre adresse email a bien été confirmée ✅");
          setTimeout(() => {
            router.push("/connexion");
          }, 3000);
        } else {
          setStatus("error");
          setMessage(data.message || "Échec de la confirmation.");
        }
      } catch (err) {
        console.error("Erreur vérification :", err);
        setStatus("error");
        setMessage("Erreur serveur lors de la confirmation.");
      }
    };

    verifyEmail();
  }, [token, email, router]);

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Confirmation d’email</h1>
      {status === "pending" && <p>Vérification en cours...</p>}
      {status !== "pending" && <p>{message}</p>}
      {status === "success" && <p>Redirection vers la page de connexion...</p>}
    </div>
  );
}