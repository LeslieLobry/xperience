"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles"; // styles par défaut LiveKit

export default function AppelPage({ params }) {
  const { conversationId } = params;
  const searchParams = useSearchParams();
  const audioOnly = searchParams?.get("audioOnly") === "1";

  const [token, setToken] = useState(null);
  const [serverUrl, setServerUrl] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchToken() {
      try {
        setLoading(true);
        setError("");

        /* ------------------ 1) Récupérer l'utilisateur courant ------------------ */
        let identity = null;
        let name = null;

        try {
          const meRes = await fetch("/api/me", {
            method: "GET",
            credentials: "include",
            headers: { Accept: "application/json" },
          });

          if (meRes.ok) {
            const meData = await meRes.json().catch(() => null);
            const user = meData?.user || meData || null;

            if (user) {
              identity =
                user.id ??
                user.utilisateurId ??
                user.userId ??
                user.uid ??
                null;
              name = user.pseudo || user.name || null;
            }
          }
        } catch (e) {
          console.warn("[AppelPage] /api/me error (non bloquant):", e);
        }

        /* ------------------ 2) Appel /api/livekit/token ------------------ */
        const qs = new URLSearchParams({
          conversationId: String(conversationId || ""),
        });
        if (identity != null) {
          qs.set("identity", String(identity));
        }

        const res = await fetch(`/api/livekit/token?${qs.toString()}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
        });

        const data = await res.json().catch(() => ({}));

        // La route peut renvoyer { token, wsUrl } ou { data: { token, wsUrl } }
        const payload =
          data?.token || data?.wsUrl ? data : data?.data || data;
        const tk = payload?.token;
        const ws =
          payload?.wsUrl ||
          payload?.url ||
          payload?.livekitUrl ||
          payload?.ws;

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
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI'",
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
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI'",
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
        <VideoConference />
      </LiveKitRoom>
    </div>
  );
}
