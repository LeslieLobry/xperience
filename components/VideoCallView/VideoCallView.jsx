"use client";

import { useEffect } from "react";

export default function VideoCallView({
  inCall,
  remoteTracks,
  startCall,
  hangupCall,
}) {
 useEffect(() => {
  if (!remoteTracks || !Array.isArray(remoteTracks)) return;

  remoteTracks.forEach(({ id, track }) => {
    const el = document.getElementById(`remote-video-${id}`);
    if (el && track) track.attach(el);
  });
}, [remoteTracks]);


  return inCall ? (
    <div className="video-call-container">
      <div className="video-box local">
        <video id="local-video" autoPlay muted playsInline />
        <div className="video-label">Moi</div>
      </div>
      {remoteTracks.map(({ id, nom }) => (
        <div className="video-box" key={id}>
          <video id={`remote-video-${id}`} autoPlay playsInline />
          <div className="video-label">{nom || "Participant"}</div>
        </div>
      ))}
    </div>
  ) : null;
}
