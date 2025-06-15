"use client";

import { useEffect, useState } from "react";
import "./RappelVerification.css";

export default function RappelVerification({ deadline }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const end = new Date(deadline);
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft("Temps écoulé");
        clearInterval(interval);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes}min ${seconds}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  if (!timeLeft || timeLeft === "Temps écoulé") return null;

  return (
    <div className="verification-alert">
      ⏳ Il vous reste <strong>{timeLeft}</strong> pour vérifier votre identité.{" "}
      <a href="/verification-identite">Vérifier maintenant</a>
    </div>
  );
}
