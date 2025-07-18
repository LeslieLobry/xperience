"use client";
import { useEffect, useRef } from "react";
import "./VideoCallView.css";

export default function VideoCallView({ inCall, remoteTracks }) {
  const localVideoRef = useRef(null);

  // Attach local video
  useEffect(() => {
    const videoEl = localVideoRef.current;
    const localTrack = window.localVideoTrack;
    console.log("[VideoCallView] Attaching local video:", localTrack);

    if (!videoEl) return;

    if (videoEl.srcObject) videoEl.srcObject = null;

    if (localTrack && localTrack.kind === "video") {
      if (typeof localTrack.attach === "function") {
        localTrack.attach(videoEl); // LiveKit style
      } else if (localTrack.mediaStream) {
        videoEl.srcObject = localTrack.mediaStream; // WebRTC natif
      }
    }
  }, [inCall, window.localVideoTrack]);

  // Attach remote tracks
  useEffect(() => {
    if (!remoteTracks || !Array.isArray(remoteTracks)) return;
    remoteTracks.forEach(({ id, track }) => {
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
          setTimeout(() => {
            console.log("[AUDIO attach][srcObject]", el.srcObject, el);
          }, 100);
        }
        console.log("[AUDIO attach]", id, el, track);
      }
    });
  }, [remoteTracks]);

  if (!inCall) return null;

  const hasRemoteVideo = remoteTracks.some(t => t.track.kind === "video");
  const audioParticipants = remoteTracks
    .filter(t => t.track.kind === "audio")
    .map(({ id, pseudo, photoUrl }) => ({ id, pseudo, photoUrl }));
  const showLocalVideo = !!window.localVideoTrack && window.localVideoTrack.kind === "video";

  return (
    <div className="video-call-container">
      {/* Remote video tracks */}
      {remoteTracks.filter(t => t.track.kind === "video").map(({ id, pseudo, photoUrl }) => (
        <div className="remote-video-wrapper" key={id}>
          <video
            id={`remote-video-${id}`}
            autoPlay
            playsInline
            className="remote-video"
          />
          <div className="video-label remote">
            {photoUrl ? (
              <img src={photoUrl} alt={pseudo || "avatar"} className="audio-avatar-img" />
            ) : null}
            {pseudo || "Participant"}
          </div>
        </div>
      ))}

      {/* Remote audio tracks - visible + log */}
      {remoteTracks.filter(t => t.track.kind === "audio").map(({ id }) => (
        <audio
          key={id}
          id={`remote-audio-${id}`}
          autoPlay
          controls
          style={{ background: "#fee", minWidth: 120, marginBottom: 8 }}
        />
      ))}

      {/* UI spéciale si APPEL AUDIO SEUL */}
      {!hasRemoteVideo && audioParticipants.length > 0 && (
        <div className="audio-call-participants">
          {audioParticipants.map(({ id, pseudo, photoUrl }) => (
            <div key={id} className="audio-avatar-card">
              <div className="audio-avatar">
                {photoUrl ? (
                  <img src={photoUrl} alt={pseudo || "avatar"} className="audio-avatar-img" />
                ) : (
                  <span role="img" aria-label="avatar" className="avatar-emoji">🎤</span>
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

      {/* Local video (visible seulement si vidéo activée) */}
      {showLocalVideo && (
        <div className="local-video-fixed">
          <video
            id="local-video"
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="local-video"
          />
          <div className="video-label local">Moi</div>
        </div>
      )}
    </div>
  );
}
