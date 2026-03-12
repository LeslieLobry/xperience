"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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

  const fetchNotifications = useCallback(async () => {
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
  }, []);

  // ✅ on garde cette fonction pour un vrai "Tout marquer comme lu"
  const markAllAsRead = useCallback(async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        credentials: "include",
      });
      setNotifications([]);
    } catch (err) {
      console.error("Erreur marquer notifications lues", err);
    }
  }, []);

  // ✅ nouvelle fonction : marquer UNE seule notification comme lue
  const markOneAsRead = useCallback(async (notifId) => {
    try {
      await fetch(`/api/notifications/${notifId}`, {
        method: "PATCH",
        credentials: "include",
      });

      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    } catch (err) {
      console.error("Erreur marquer notification lue", err);
    }
  }, []);

  const scheduleRefreshSoon = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      fetchNotifications();
    }, 400);
  }, [fetchNotifications]);

  // ✅ retire localement les notifs liées à une conversation
  const clearConversationNotifsLocally = useCallback((conversationId) => {
    const convStr = String(conversationId);

    setNotifications((prev) =>
      prev.filter((n) => {
        const lien = n?.lien || "";

        // plus fiable que msg.includes(convStr)
        return !lien.includes(`conversationId=${convStr}`);
      })
    );
  }, []);

  const formatNotifText = useCallback((notif) => {
    const pseudoRaw = (notif?.auteur?.pseudo || "").trim();
    let msgRaw = (notif?.message || "").trim();

    if (!pseudoRaw) return msgRaw;

    const normalize = (s) =>
      String(s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const pseudo = normalize(pseudoRaw);

    const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pEsc = escapeRegExp(pseudoRaw);

    const startPrefixRe = new RegExp(
      `^\\s*(?:${pEsc}\\s*(?::|-)?\\s*)+(?=\\S)`,
      "i"
    );

    msgRaw = msgRaw.replace(startPrefixRe, "").replace(startPrefixRe, "").trim();

    const msg = normalize(msgRaw);

    const isGalleryEvent =
      msg.includes("galerie") ||
      msg.includes("acces") ||
      msg.includes("demande") ||
      msg.includes("accepte") ||
      msg.includes("refuse");

    if (isGalleryEvent) return msgRaw;

    const pseudoWords = pseudo.split(" ").filter((w) => w.length >= 3);
    const pseudoAlreadyInMsg =
      msg.includes(pseudo) || pseudoWords.some((w) => msg.includes(w));

    if (pseudoAlreadyInMsg) return msgRaw;

    return `${pseudoRaw} : ${msgRaw}`;
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchNotifications();

    (async () => {
      try {
        const meRes = await fetch("/api/me", { credentials: "include" });
        const meData = meRes.ok ? await meRes.json() : null;

        const userId = meData?.success ? meData?.user?.id : null;
        if (!userId || cancelled) return;

        clientRef.current = new Ably.Realtime({
          authUrl: "/api/ably-token",
          authMethod: "GET",
        });

        channelRef.current = clientRef.current.channels.get(`notification-${userId}`);

        channelRef.current.subscribe("notification", () => {
          scheduleRefreshSoon();
        });

        channelRef.current.subscribe("notif:clear-conversation", (msg) => {
          const convId = msg?.data?.conversationId;
          if (!convId) return;

          clearConversationNotifsLocally(convId);
          scheduleRefreshSoon();
        });

        channelRef.current.subscribe("refresh-conversations", () => {
          scheduleRefreshSoon();
        });
      } catch (e) {
        console.error("Erreur init Ably notifications", e);
      }
    })();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 180000);

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
  }, [fetchNotifications, scheduleRefreshSoon, clearConversationNotifsLocally]);

  if (error) return <p>{error}</p>;

  if (notifications.length === 0) {
    return <p>{loading ? "Chargement..." : "Aucune notification"}</p>;
  }

  return (
    <div className="notifications-popup">
      {/* ✅ tu gardes markAllAsRead, et tu peux l’utiliser ici */}
      <div className="notifications-actions">
        <button onClick={markAllAsRead}>Tout marquer comme lu</button>
      </div>

      <ul>
        {notifications.map((notif) => (
          <li key={notif.id}>
            <Link
              href={notif.lien || "#"}
              onClick={async () => {
                await markOneAsRead(notif.id);
              }}
            >
              {formatNotifText(notif)}
            </Link>
            <small>{new Date(notif.createdAt).toLocaleString()}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}