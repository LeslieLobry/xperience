"use client";
import { useEffect, useRef } from "react";
import "./VideoCallView.css";

export default function VideoCallView({ inCall, remoteTracks }) {
  const localVideoRef = useRef(null);

  // Attach local video
  useEffect(() => {
    const videoEl = localVideoRef.current;
    const localTrack = window.localVideoTrack;
    if (videoEl && localTrack && localTrack.kind === "video") {
      localTrack.attach(videoEl);
    }
  }, [inCall]);

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
        if (el && track.attach) track.attach(el);
      }
    });
  }, [remoteTracks]);

  if (!inCall) return null;

  const hasRemoteVideo = remoteTracks.some(t => t.track.kind === "video");
  const audioParticipants = remoteTracks
    .filter(t => t.track.kind === "audio")
    .map(({ id, pseudo, photoUrl }) => ({ id, pseudo, photoUrl }));

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

      {/* Remote audio tracks (toujours, même pour vidéo) */}
      {remoteTracks.filter(t => t.track.kind === "audio").map(({ id }) => (
        <audio
          key={id}
          id={`remote-audio-${id}`}
          autoPlay
          style={{ display: "none" }}
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

      {/* Local video (affiché même en audio, pour cohérence UI) */}
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
    </div>
  );
}
