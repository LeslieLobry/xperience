"use client";

import { useEffect, useState } from "react";
import "./RappelVerification.css";
import { useAuth } from "../../context/AuthContext"; 
export default function RappelVerification({ deadline }) {
  const { user, refreshUser } = useAuth();
  const [timeLeft, setTimeLeft] = useState("");

  // Actualise l'utilisateur de temps en temps pour suivre l'état Stripe en live :
  useEffect(() => {
    // Vérifie toutes les 5s si le user est validé (sinon on ne capte pas l'update Stripe sans reload)
    const interval = setInterval(() => {
      refreshUser(); // tu as déjà ce hook
    }, 5000);
    return () => clearInterval(interval);
  }, [refreshUser]);

  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const end = new Date(deadline);
      const diff = end - now;
      if (diff <= 0) return setTimeLeft("Temps écoulé");
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${h}h ${m}min ${s}s`);
    };
    calc();
    const timer = setInterval(calc, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  // Si vérif faite ou pas de rappel, on n’affiche plus rien
  if (!timeLeft || timeLeft === "Temps écoulé" || user?.verificationIdentite) return null;

  return (
    <div className="verification-alert">
      ⏳ Il vous reste <strong>{timeLeft}</strong> pour vérifier votre identité.{" "}
      <a href="/verification-identite">Vérifier maintenant</a>
    </div>
  );
}
