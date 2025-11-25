"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";

export default function AppelPage({ params }) {
  const { conversationId } = params;
  const searchParams = useSearchParams();
  const audioOnly = searchParams?.get("audioOnly") === "1";

  const [token, setToken] = useState(null);
  const [serverUrl, setServerUrl] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  /* ---------------------------------------------------------------------------
     1) Génération d’un deviceId unique par appareil
     --------------------------------------------------------------------------- */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const KEY = "lk-device-id";
    let v = window.localStorage.getItem(KEY);

    if (!v) {
      v = `dev-${Math.random().toString(36).slice(2)}-${Date.now()}`;
      window.localStorage.setItem(KEY, v);
    }

    setDeviceId(v);
  }, []);

  /* ---------------------------------------------------------------------------
     2) Récupération du token LiveKit une fois deviceId disponible
     --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!deviceId) return;
    let cancelled = false;

    async function fetchToken() {
      try {
        setLoading(true);
        setError("");

        // Appel /api/livekit/token
        const qs = new URLSearchParams({
          conversationId: String(conversationId || ""),
          deviceId: String(deviceId),
        });

        const res = await fetch(`/api/livekit/token?${qs.toString()}`, {
          method: "GET",
          credentials: "include",
        });

        const data = await res.json().catch(() => ({}));
        const payload =
          data?.token || data?.wsUrl ? data : data?.data || data;

        if (!payload?.token || !payload?.wsUrl) {
          throw new Error("Réponse invalide du serveur LiveKit.");
        }

        if (!cancelled) {
          setToken(payload.token);
          setServerUrl(payload.wsUrl);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || "Erreur de connexion à LiveKit.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchToken();
    return () => {
      cancelled = true;
    };
  }, [conversationId, deviceId]);

  /* ---------------------------------------------------------------------------
     UI : Loading
     --------------------------------------------------------------------------- */
  if (loading) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "#050811",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#e0c084",
        }}
      >
        Connexion à l’appel…
      </div>
    );
  }

  /* ---------------------------------------------------------------------------
     UI : Erreur
     --------------------------------------------------------------------------- */
  if (error || !token || !serverUrl) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "#050811",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ff8080",
          fontSize: "1.1rem",
          textAlign: "center",
          padding: 20,
        }}
      >
        {error}
      </div>
    );
  }

  /* ---------------------------------------------------------------------------
     UI : Appel LiveKit
     --------------------------------------------------------------------------- */
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#050811",
        overflow: "hidden",
      }}
    >
      <LiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect={true}
        audio={true}
        video={!audioOnly}
        data-lk-theme="default"
        style={{ width: "100%", height: "100%" }}
      >
        <VideoConference />
      </LiveKitRoom>
    </div>
  );
}
