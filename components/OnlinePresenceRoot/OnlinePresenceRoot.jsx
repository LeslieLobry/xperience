// components/OnlinePresenceRoot/OnlinePresenceRoot.jsx
"use client";

import { useAuth } from "../../context/AuthContext";
import { OnlineStatusProvider } from "../../context/OnlineStatusContext";

export default function OnlinePresenceRoot({ children }) {
  const auth = useAuth() || {};
  const user = auth?.user ?? null;

  console.log("[OnlinePresenceRoot]", {
    authReady: !!auth?.authReady,
    authUserId: user?.id,
    authPseudo: user?.pseudo,
  });

  // ✅ IMPORTANT : on ne conditionne plus le tree
  // Le Provider est toujours monté, et s'active seulement si user?.id existe.
  return <OnlineStatusProvider user={user}>{children}</OnlineStatusProvider>;
}
