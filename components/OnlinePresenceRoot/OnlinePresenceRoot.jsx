// components/OnlinePresenceRoot/OnlinePresenceRoot.jsx
"use client";

import React from "react";
import { useAuth } from "../../context/AuthContext";
import { OnlineStatusProvider } from "../../context/OnlineStatusContext";

export default function OnlinePresenceRoot({ children }) {
  const { user, authReady } = useAuth() || {};

  // ✅ Tant que l'auth n'a pas fini son 1er check -> pas de présence
  if (!authReady) return children;

  // ✅ Pas connecté -> pas de présence
  if (!user?.id) return children;

  // ✅ Connecté -> présence ON
  return <OnlineStatusProvider user={user}>{children}</OnlineStatusProvider>;
}
