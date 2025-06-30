// components/NotificationAppelEntrant.jsx
"use client";

import "./NotificationAppelEntrant.css";

export default function NotificationAppelEntrant({ appel, onAccepter, onRefuser }) {
  if (!appel) return null;

  return (
    <div className="appel-notif">
      <div className="appel-info">
        <strong>{appel.from.pseudo}</strong> vous appelle en {appel.type === "video" ? "📹 vidéo" : "🔊 audio"}.
      </div>
      <div className="appel-actions">
        <button className="btn-accepter" onClick={() => onAccepter(appel.type)}>Accepter</button>
        <button className="btn-refuser" onClick={onRefuser}>Refuser</button>
      </div>
    </div>
  );
}
