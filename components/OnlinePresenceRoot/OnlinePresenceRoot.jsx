"use client";

import { useAuth } from "../../context/AuthContext";
import { OnlineStatusProvider } from "../../context/OnlineStatusContext";

export default function OnlinePresenceRoot({ children }) {
  const auth = useAuth() || {};
  const userId = auth?.user?.id ? String(auth.user.id) : null;

  return <OnlineStatusProvider userId={userId}>{children}</OnlineStatusProvider>;
}
