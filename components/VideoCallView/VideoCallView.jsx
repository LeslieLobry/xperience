"use client";
import { useEffect, useRef } from "react";
import "./VideoCallView.css";

export default function VideoCallView({ inCall, remoteTracks }) {
  const localVideoRef = useRef(null);

  useEffect(() => {
    const videoEl = localVideoRef.current;
    const localTrack = window.localVideoTrack;
    if (videoEl && localTrack) {
      localTrack.attach(videoEl);
    }
  }, [inCall]);

  useEffect(() => {
    if (!remoteTracks || !Array.isArray(remoteTracks)) return;
    remoteTracks.forEach(({ id, track }) => {
      const el = document.getElementById(`remote-video-${id}`);
      if (el && track) track.attach(el);
    });
  }, [remoteTracks]);

  if (!inCall) return null;

  return (
    <div className="video-call-container">
      {remoteTracks.map(({ id, nom }) => (
        <div className="remote-video-wrapper" key={id}>
          <video
            id={`remote-video-${id}`}
            autoPlay
            playsInline
            className="remote-video"
          />
          <div className="video-label remote">{nom || "Participant"}</div>
        </div>
      ))}

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
