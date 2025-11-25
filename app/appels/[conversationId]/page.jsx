"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  ControlBar,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";

function MessengerCallLayout({ audioOnly }) {
  // On récupère toutes les caméras (local + remote)
  const tracks = useTracks(
    [Track.Source.Camera, Track.Source.ScreenShare],
    { onlySubscribed: true }
  );

  const { mainTracks, localTrack } = useMemo(() => {
    const cameraTracks = tracks.filter(
      (tr) => tr.publication?.source === Track.Source.Camera
    );

    const local = cameraTracks.find((tr) => tr.participant.isLocal);
    const remotes = cameraTracks.filter((tr) => !tr.participant.isLocal);

    return {
      localTrack: local || null,
      // Si pas encore de remote (en attendant l’autre), on affiche ta cam en grand
      mainTracks: remotes.length > 0 ? remotes : cameraTracks,
    };
  }, [tracks]);

  if (audioOnly) {
    return (
      <div className="call-root">
        <div className="call-audio-placeholder">
          <p>Appel audio en cours…</p>
        </div>
        <div className="call-controls">
          <ControlBar controls={{ screenShare: false }} />
        </div>

        <style jsx global>{`
          .call-root {
            position: relative;
            width: 100vw;
            height: 100vh;
            background: #050811;
            display: flex;
            flex-direction: column;
          }

          .call-audio-placeholder {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #e0c084;
            font-size: 1.2rem;
          }

          .call-controls {
            padding: 12px 24px 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            background: radial-gradient(
                circle at top,
                rgba(255, 255, 255, 0.06),
                transparent 65%
              )
              #050811;
            border-top: 1px solid rgba(224, 192, 132, 0.2);
          }

          .call-controls .lk-control-bar {
            max-width: 520px;
            width: 100%;
            justify-content: space-between;
          }

          @media (max-width: 768px) {
            .call-controls {
              padding: 8px 12px 16px;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="call-root">
      <div className="call-main">
        {/* Vidéo principale (l'autre en grand, sinon toi en grand en attendant) */}
        <GridLayout tracks={mainTracks}>
          <ParticipantTile />
        </GridLayout>

        {/* Petite vignette avec ta propre caméra en bas à droite */}
        {localTrack && (
          <div className="call-self">
            <GridLayout tracks={[localTrack]}>
              <ParticipantTile />
            </GridLayout>
          </div>
        )}
      </div>

      {/* Barre de contrôle en bas comme Messenger */}
      <div className="call-controls">
        <ControlBar />
      </div>

      <style jsx global>{`
        .call-root {
          position: relative;
          width: 100vw;
          height: 100vh;
          background: #050811;
          display: flex;
          flex-direction: column;
        }

        .call-main {
          position: relative;
          flex: 1;
          overflow: hidden;
        }

        .call-main .lk-grid-layout {
          width: 100%;
          height: 100%;
        }

        .call-main .lk-participant-tile {
          border-radius: 18px;
          overflow: hidden;
        }

        .call-self {
          position: absolute;
          bottom: 90px;
          right: 24px;
          width: 220px;
          max-width: 35vw;
          aspect-ratio: 16 / 9;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.55);
        }

        .call-self .lk-grid-layout {
          width: 100%;
          height: 100%;
        }

        .call-controls {
          padding: 12px 24px 20px;
          display: flex;
          justify-content: center;
          align-items: center;
          background: radial-gradient(
              circle at top,
              rgba(255, 255, 255, 0.06),
              transparent 65%
            )
            #050811;
          border-top: 1px solid rgba(224, 192, 132, 0.2);
        }

        .call-controls .lk-control-bar {
          max-width: 520px;
          width: 100%;
          justify-content: space-between;
        }

        @media (max-width: 768px) {
          .call-self {
            width: 140px;
            bottom: 80px;
            right: 16px;
          }
          .call-controls {
            padding: 8px 12px 16px;
          }
        }
      `}</style>
    </div>
  );
}

export default function AppelPage({ params }) {
  const { conversationId } = params;
  const searchParams = useSearchParams();
  const audioOnly = searchParams?.get("audioOnly") === "1";

  const [token, setToken] = useState(null);
  const [serverUrl, setServerUrl] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // 1) deviceId
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

  // 2) token LiveKit
  useEffect(() => {
    if (!deviceId) return;
    let cancelled = false;

    async function fetchToken() {
      try {
        setLoading(true);
        setError("");

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
        {error || "Impossible de rejoindre l’appel."}
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect={true}
      audio={true}
      video={!audioOnly}
      data-lk-theme="default"
      style={{ width: "100vw", height: "100vh" }}
    >
      <MessengerCallLayout audioOnly={audioOnly} />
    </LiveKitRoom>
  );
}
