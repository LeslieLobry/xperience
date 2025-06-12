"use client";

import { useEffect, useState } from "react";
import "./MenuProfilActions.css";
import Image from "next/image";
import SignalementModal from "../SignalementModal/SignalementModal";

export default function MenuProfilActions({ cibleId }) {
  const [open, setOpen] = useState(false);
  const [bloque, setBloque] = useState(false);
  const [showSignalement, setShowSignalement] = useState(false);

  // 🔎 Vérifie si le membre est déjà bloqué au chargement
  useEffect(() => {
    const checkIfBloque = async () => {
      try {
        const res = await fetch(`/api/blocage/${cibleId}`);
        if (res.ok) {
          const data = await res.json();
          setBloque(data.estBloqué);
        }
      } catch (err) {
        console.error("Erreur lors de la vérification du blocage :", err);
      }
    };

    checkIfBloque();
  }, [cibleId]);

  // 🔒 Bloquer ou débloquer
  const handleBlocage = async () => {
    try {
      const res = await fetch(`/api/blocage`, {
        method: bloque ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bloquéId: cibleId }),
      });

      if (res.ok) {
        setBloque((prev) => !prev);
        setOpen(false);
      } else {
        console.error("Erreur lors du blocage/déblocage");
      }
    } catch (err) {
      console.error("Erreur serveur :", err);
    }
  };

  // 🚨 Ouvre la modale de signalement
  const handleSignalement = () => {
    setShowSignalement(true);
    setOpen(false);
  };

  return (
    <div className="profil-menu">
      <button className="menu-button" onClick={() => setOpen((o) => !o)}>
        <Image
          src="/images/warning.svg"
          alt="signaler"
          width={46}
          height={46}
        />
      </button>

      {open && (
        <div className="menu-dropdown">
          <button onClick={handleBlocage}>
            {bloque ? "Débloquer ce membre" : "Bloquer ce membre"}
          </button>
          <button onClick={handleSignalement}>Signaler ce membre</button>
        </div>
      )}

      {showSignalement && (
        <SignalementModal
          cibleId={cibleId}
          onClose={() => setShowSignalement(false)}
        />
      )}
    </div>
  );
}
