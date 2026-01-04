"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Ably from "ably";
import "./Notifications.css";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const clientRef = useRef(null);
  const channelRef = useRef(null);

  const inFlightRef = useRef(false);
  const pendingRef = useRef(false);
  const timerRef = useRef(null);

  const fetchNotifications = async () => {
    if (inFlightRef.current) {
      pendingRef.current = true;
      return;
    }
    inFlightRef.current = true;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : []);
      } else {
        setError("Erreur lors du chargement");
      }
    } catch (err) {
      setError("Erreur réseau");
      console.error("Erreur fetch notifications", err);
    } finally {
      setLoading(false);
      inFlightRef.current = false;

      if (pendingRef.current) {
        pendingRef.current = false;
        fetchNotifications();
      }
    }
  };

  const markAsRead = async () => {
    try {
      await fetch("/api/notifications", { method: "PATCH", credentials: "include" });
      setNotifications([]);
    } catch (err) {
      console.error("Erreur marquer notifications lues", err);
    }
  };

  const scheduleRefreshSoon = () => {
    if (timerRef.current) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      fetchNotifications();
    }, 400);
  };

  useEffect(() => {
    let cancelled = false;

    fetchNotifications();

    (async () => {
      try {
        // on récupère userId (car ton channel est notification-${userId})
        const meRes = await fetch("/api/me", { credentials: "include" });
        const meData = meRes.ok ? await meRes.json() : null;

        const userId = meData?.success ? meData?.user?.id : null;
        if (!userId || cancelled) return;

        // ✅ Ably avec token route (plus sécurisé)
        clientRef.current = new Ably.Realtime({
          authUrl: "/api/ably-token",
          authMethod: "GET",
        });

        channelRef.current = clientRef.current.channels.get(`notification-${userId}`);

        channelRef.current.subscribe("notification", () => {
          scheduleRefreshSoon();
        });
      } catch (e) {
        console.error("Erreur init Ably notifications", e);
      }
    })();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 180000); // backup 3 minutes

    return () => {
      cancelled = true;
      clearInterval(interval);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      try {
        if (channelRef.current) channelRef.current.unsubscribe();
      } catch {}

      try {
        if (clientRef.current) clientRef.current.close();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <p>{error}</p>;
  if (notifications.length === 0) return <p>{loading ? "Chargement..." : "Aucune notification"}</p>;

  return (
    <div className="notifications-popup">
      <ul>
        {notifications.map((notif) => (
          <li key={notif.id}>
            <Link
              href={notif.lien || "#"}
              onClick={async () => {
                await markAsRead();
              }}
            >
              {notif.message}
            </Link>
            <small>{new Date(notif.createdAt).toLocaleString()}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
