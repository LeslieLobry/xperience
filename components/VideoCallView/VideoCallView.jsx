"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import "./VideoCallView.css";

export default function VideoCallView({ inCall, remoteTracks, hangupCall }) {
  const localVideoRef = useRef(null);

  // PiP drag
  const pipRef = useRef(null);
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, x: 0, y: 0 });

  // UI states
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [facingMode, setFacingMode] = useState("user"); // "user" | "environment"

  const hasRemoteVideo = useMemo(
    () => Array.isArray(remoteTracks) && remoteTracks.some((t) => t?.track?.kind === "video"),
    [remoteTracks]
  );

  const remoteVideos = useMemo(() => {
    if (!Array.isArray(remoteTracks)) return [];
    return remoteTracks.filter((t) => t?.track?.kind === "video");
  }, [remoteTracks]);

  const remoteAudios = useMemo(() => {
    if (!Array.isArray(remoteTracks)) return [];
    return remoteTracks.filter((t) => t?.track?.kind === "audio");
  }, [remoteTracks]);

  const audioParticipants = useMemo(() => {
    if (!Array.isArray(remoteTracks)) return [];
    return remoteTracks
      .filter((t) => t?.track?.kind === "audio")
      .map(({ id, pseudo, photoUrl }) => ({ id, pseudo, photoUrl }));
  }, [remoteTracks]);

  const showLocalVideo = useMemo(() => {
    return !!window.localVideoTrack && window.localVideoTrack.kind === "video";
  }, [inCall]);

  /* ----------------------------
     Attach LOCAL video
  ---------------------------- */
  useEffect(() => {
    if (!inCall) return;

    const videoEl = localVideoRef.current;
    const localTrack = window.localVideoTrack;

    if (!videoEl) return;

    try {
      if (videoEl.srcObject) videoEl.srcObject = null;

      if (localTrack && localTrack.kind === "video") {
        if (typeof localTrack.attach === "function") {
          localTrack.attach(videoEl); // LiveKit
        } else if (localTrack.mediaStream) {
          videoEl.srcObject = localTrack.mediaStream; // WebRTC natif
        }
      }
    } catch (e) {
      console.error("[VideoCallView] local attach error:", e);
    }

    return () => {
      try {
        if (localTrack && typeof localTrack.detach === "function") {
          localTrack.detach(videoEl);
        }
      } catch {}
    };
  }, [inCall]);

  /* ----------------------------
     Attach REMOTE tracks
  ---------------------------- */
  useEffect(() => {
    if (!inCall) return;
    if (!Array.isArray(remoteTracks)) return;

    remoteTracks.forEach(({ id, track }) => {
      if (!track) return;

      // VIDEO
      if (track.kind === "video") {
        const el = document.getElementById(`remote-video-${id}`);
        if (el && track.attach) track.attach(el);
      }

      // AUDIO
      if (track.kind === "audio") {
        const el = document.getElementById(`remote-audio-${id}`);
        if (el && track.attach) {
          track.attach(el);
          el.volume = 1;
          el.muted = false;
        }
      }
    });
  }, [inCall, remoteTracks]);

  /* ----------------------------
     Controls
  ---------------------------- */
  const toggleMic = async () => {
    try {
      const t = window.localAudioTrack;
      if (!t) return;

      // LiveKit LocalAudioTrack
      if (typeof t.mute === "function" && typeof t.unmute === "function") {
        if (micMuted) {
          await t.unmute();
          setMicMuted(false);
        } else {
          await t.mute();
          setMicMuted(true);
        }
        return;
      }

      // WebRTC fallback
      if (t.mediaStream) {
        const tracks = t.mediaStream.getAudioTracks();
        tracks.forEach((tr) => (tr.enabled = micMuted));
        setMicMuted(!micMuted);
      }
    } catch (e) {
      console.error("[toggleMic] error:", e);
    }
  };

  const toggleCam = async () => {
    try {
      const t = window.localVideoTrack;
      if (!t) return;

      // LiveKit LocalVideoTrack
      if (typeof t.mute === "function" && typeof t.unmute === "function") {
        if (camOff) {
          await t.unmute();
          setCamOff(false);
        } else {
          await t.mute();
          setCamOff(true);
        }
        return;
      }

      // WebRTC fallback
      if (t.mediaStream) {
        const tracks = t.mediaStream.getVideoTracks();
        tracks.forEach((tr) => (tr.enabled = camOff));
        setCamOff(!camOff);
      }
    } catch (e) {
      console.error("[toggleCam] error:", e);
    }
  };

  const switchCamera = async () => {
    try {
      const t = window.localVideoTrack;
      if (!t) return;

      const next = facingMode === "user" ? "environment" : "user";

      // LiveKit LocalVideoTrack supports restartTrack in many setups
      if (typeof t.restartTrack === "function") {
        await t.restartTrack({ facingMode: next });
        setFacingMode(next);
        return;
      }

      // Fallback: try to pick another camera by deviceId and restartTrack({ deviceId })
      if (navigator.mediaDevices?.enumerateDevices && typeof t.restartTrack === "function") {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cams = devices.filter((d) => d.kind === "videoinput");
        if (cams.length >= 2) {
          const chosen = cams[0];
          await t.restartTrack({ deviceId: chosen.deviceId });
          setFacingMode(next);
          return;
        }
      }

      console.warn("[switchCamera] restartTrack not available on this track.");
    } catch (e) {
      console.error("[switchCamera] error:", e);
    }
  };

  /* ----------------------------
     PiP drag handlers
  ---------------------------- */
  useEffect(() => {
    const pip = pipRef.current;
    if (!pip) return;

    const onPointerDown = (e) => {
      dragRef.current.dragging = true;
      dragRef.current.startX = e.clientX;
      dragRef.current.startY = e.clientY;

      pip.setPointerCapture?.(e.pointerId);
      pip.classList.add("dragging");
    };

    const onPointerMove = (e) => {
      if (!dragRef.current.dragging) return;

      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;

      const nextX = dragRef.current.x + dx;
      const nextY = dragRef.current.y + dy;

      // clamp to viewport a bit
      const maxX = Math.max(0, window.innerWidth - pip.offsetWidth - 8);
      const maxY = Math.max(0, window.innerHeight - pip.offsetHeight - 8);

      const clampedX = Math.min(Math.max(nextX, 8), maxX);
      const clampedY = Math.min(Math.max(nextY, 8), maxY);

      pip.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0)`;

      // do not commit base position yet (commit on up)
    };

    const onPointerUp = (e) => {
      if (!dragRef.current.dragging) return;
      dragRef.current.dragging = false;

      // read the current translate and commit
      const match = pip.style.transform.match(/translate3d\(([-\d.]+)px,\s*([-\d.]+)px/);
      if (match) {
        dragRef.current.x = parseFloat(match[1]) || 0;
        dragRef.current.y = parseFloat(match[2]) || 0;
      }

      pip.releasePointerCapture?.(e.pointerId);
      pip.classList.remove("dragging");
    };

    pip.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      pip.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  if (!inCall) return null;

  return (
    <div className="call-overlay">
      {/* REMOTE FULLSCREEN */}
      {remoteVideos.map(({ id, pseudo, photoUrl }) => (
        <div className="call-remote-wrapper" key={id}>
          <video id={`remote-video-${id}`} autoPlay playsInline className="call-remote-video" />
          <div className="call-label remote">
            {photoUrl ? <img src={photoUrl} alt="" className="call-label-avatar" /> : null}
            {pseudo || "Participant"}
          </div>
        </div>
      ))}

      {/* REMOTE AUDIO (hidden, just for attach) */}
      {remoteAudios.map(({ id }) => (
        <audio key={id} id={`remote-audio-${id}`} autoPlay className="call-audio-hidden" />
      ))}

      {/* AUDIO-ONLY UI */}
      {!hasRemoteVideo && audioParticipants.length > 0 && (
        <div className="audio-call-participants">
          {audioParticipants.map(({ id, pseudo, photoUrl }) => (
            <div key={id} className="audio-avatar-card">
              <div className="audio-avatar">
                {photoUrl ? (
                  <img src={photoUrl} alt={pseudo || "avatar"} className="audio-avatar-img" />
                ) : (
                  <span role="img" aria-label="avatar" className="avatar-emoji">
                    🎤
                  </span>
                )}
                <div className="audio-wave">
                  <span className="bar" />
                  <span className="bar" />
                  <span className="bar" />
                </div>
              </div>
              <div className="audio-name">{pseudo || "Participant"}</div>
            </div>
          ))}
        </div>
      )}

      {/* LOCAL PiP */}
      {showLocalVideo && (
        <div className="call-local-pip" ref={pipRef}>
          <video
            id="local-video"
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="call-local-video"
          />
          <div className="call-label local">Moi</div>

          {/* tiny hint */}
          <div className="pip-hint">⇕ Déplacer</div>
        </div>
      )}

      {/* CONTROLS */}
      <div className="call-controls">
        <button
          className={`call-btn ${micMuted ? "active" : ""}`}
          onClick={toggleMic}
          title={micMuted ? "Activer micro" : "Couper micro"}
        >
          🎤
        </button>

        <button
          className={`call-btn ${camOff ? "active" : ""}`}
          onClick={toggleCam}
          title={camOff ? "Activer caméra" : "Couper caméra"}
        >
          📷
        </button>

        <button className="call-btn" onClick={switchCamera} title="Retourner caméra">
          🔄
        </button>

        <button className="call-btn hangup" onClick={hangupCall} title="Raccrocher">
          📞
        </button>
      </div>
    </div>
  );
}
