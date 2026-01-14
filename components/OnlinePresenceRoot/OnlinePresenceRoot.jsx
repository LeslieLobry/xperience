// components/OnlinePresenceRoot/OnlinePresenceRoot.jsx
"use client";

import React, { useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { OnlineStatusProvider } from "../../context/OnlineStatusContext";

export default function OnlinePresenceRoot({ children }) {
  const auth = useAuth() || {};
  const userId = auth?.user?.id ? String(auth.user.id) : null;
  const authReady = !!auth?.authReady;

  // ✅ Tant que l'auth n'est pas prête, on rend l'app telle quelle
  // (mais on évite de changer le tree trop souvent)
  if (!authReady) return children;

  // ✅ Pas connecté : pas de présence
  if (!userId) return children;

  // ✅ Connecté : provider monté (key = userId => reset propre en cas de changement d'user)
  return (
    <OnlineStatusProvider key={userId} user={auth.user}>
      {children}
    </OnlineStatusProvider>
  );
}
