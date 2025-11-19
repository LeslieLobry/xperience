"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles"; // styles par défaut LiveKit

// ⚠️ IMPORTANT : cette page suppose que tu as déjà une route /api/livekit/token
// qui accepte ?conversationId=... et renvoie { token, wsUrl } (ou { data:{token,wsUrl} })

export default function AppelPage({ params }) {
  const { conversationId } = params;
  const searchParams = useSearchParams();
  const audioOnly = searchParams?.get("audioOnly") === "1";

  const [token, setToken] = useState(null);
  const [serverUrl, setServerUrl] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Récupérer le token LiveKit pour cette conversation
  useEffect(() => {
    let cancelled = false;

    async function fetchToken() {
      try {
        setLoading(true);
        setError("");

        const qs = new URLSearchParams({
          conversationId: String(conversationId || ""),
        });

        const res = await fetch(`/api/livekit/token?${qs.toString()}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
        });

        const data = await res.json().catch(() => ({}));

        // La route peut renvoyer { token, wsUrl } ou { data: { token, wsUrl } }
        const payload = data?.token || data?.wsUrl ? data : data?.data || data;
        const tk = payload?.token;
        const ws = payload?.wsUrl || payload?.url || payload?.livekitUrl || payload?.ws;

        if (!res.ok || !tk || !ws) {
          console.error("[LiveKit token error]", res.status, data);
          throw new Error(
            data?.error ||
              `Réponse invalide de /api/livekit/token (status ${res.status})`
          );
        }

        if (!cancelled) {
          setToken(tk);
          setServerUrl(ws);
        }
      } catch (e) {
        console.error("[AppelPage] fetchToken error:", e);
        if (!cancelled) {
          setError(
            e?.message ||
              "Impossible d'initialiser l'appel. Réessaie dans quelques instants."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchToken();

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // Écran de chargement
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
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI'",
        }}
      >
        Connexion à l’appel…
      </div>
    );
  }

  // Erreur
  if (error || !token || !serverUrl) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "#050811",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#f87171",
          padding: "16px",
          textAlign: "center",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI'",
        }}
      >
        <h1 style={{ fontSize: "1.3rem", marginBottom: "0.75rem" }}>
          Erreur lors de l’appel
        </h1>
        <p style={{ maxWidth: 400, opacity: 0.9 }}>{error}</p>
      </div>
    );
  }

  // ✅ Affichage de la room LiveKit
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
        video={!audioOnly} // si audioOnly=1 => pas de vidéo
        data-lk-theme="default"
        style={{ width: "100%", height: "100%" }}
      >
        {/* 
          VideoConference = UI prête à l’emploi (mute, caméra, grid, chat, etc.)
          Tu pourras plus tard la remplacer par une UI custom si tu veux un style X-periences plus poussé.
        */}
        <VideoConference />
      </LiveKitRoom>
    </div>
  );
}
