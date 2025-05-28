"use client";

import { useState } from "react";
import "./MenuProfilActions.css";
import SignalementModal from "../SignalementModal/SignalementModal";

export default function MenuProfilActions({ cibleId }) {
  const [open, setOpen] = useState(false);
  const [bloque, setBloque] = useState(false);
  const [showSignalement, setShowSignalement] = useState(false);

  const handleBlocage = async () => {
    await fetch(`/api/blocage/${cibleId}`, { method: "POST" });
    setBloque((prev) => !prev);
    setOpen(false);
  };

  const handleSignalement = () => {
    setShowSignalement(true);
    setOpen(false);
  };

  return (
    <div className="profil-menu">
      <button className="menu-button" onClick={() => setOpen((o) => !o)}>
        ⚙️
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
