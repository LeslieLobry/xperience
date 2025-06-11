"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      } else {
        setError("Erreur lors du chargement");
      }
    } catch (err) {
      setError("Erreur réseau");
      console.error("Erreur fetch notifications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        credentials: "include",
      });
      if (res.ok) setNotifications([]);
    } catch (err) {
      console.error("Erreur marquer notifications lues", err);
    }
  };

  if (loading) return <p>Chargement...</p>;
  if (error) return <p>{error}</p>;
  if (notifications.length === 0) return <p>Aucune notification</p>;

  return (
    <div className="notifications-popup">
           <ul>
        {notifications.map((notif) => (
          <li key={notif.id}>
            <Link href={notif.lien || "#"} onClick={() => setNotifications([])}>
              {notif.message}
            </Link>
            <small>{new Date(notif.createdAt).toLocaleString()}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
