// components/OnlinePresenceRoot/OnlinePresenceRoot.jsx
"use client";

import { useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { OnlineStatusProvider } from "../../context/OnlineStatusContext";

export default function OnlinePresenceRoot({ children }) {
  const auth = useAuth() || {};
  const user = auth?.user ?? null;

  // ✅ on ne passe pas l'objet user (qui change tout le temps)
  const userId = user?.id ?? null;
  const pseudo = user?.pseudo ?? null;

  // ✅ optionnel : stabilise un objet config si tu veux (sinon tu peux passer userId direct)
  const presenceUser = useMemo(() => {
    if (!userId) return null;
    return { id: userId, pseudo };
  }, [userId, pseudo]);

  // ⚠️ évite le console.log à chaque render (ça spam et ça ralentit)
  // Si tu veux debug, log uniquement quand userId change :
  // useEffect(() => console.log(...), [userId]);

  return (
    <OnlineStatusProvider user={presenceUser}>
      {children}
    </OnlineStatusProvider>
  );
}
