"use client";

import React from "react";
import { useAuth } from "../../context/AuthContext";
import { OnlineStatusProvider } from "../../context/OnlineStatusContext";

export default function OnlinePresenceRoot({ children }) {
  const { user } = useAuth() || {};

  // ✅ tant que user = undefined (pas encore check) ou null (déco),
  // le provider ne fera rien (pas de connexion Ably)
  return <OnlineStatusProvider user={user}>{children}</OnlineStatusProvider>;
}
