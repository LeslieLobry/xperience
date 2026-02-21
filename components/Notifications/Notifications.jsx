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

  // ⚠️ Ton PATCH actuel marque TOUT lu et vide tout.
  // On le garde pour "Tout marquer lu" (ou clic notif si tu veux),
  // mais ce n’est pas ce qui doit se passer quand tu lis dans une conversation.
  const markAllAsRead = useCallback(async () => {
    try {
      await fetch("/api/notifications", { method: "PATCH", credentials: "include" });
      setNotifications([]);
    } catch (err) {
      console.error("Erreur marquer notifications lues", err);
    }
  }, []);

  const scheduleRefreshSoon = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      fetchNotifications();
    }, 400);
  }, [fetchNotifications]);

  // ✅ retire localement les notifs liées à une conversation (basé sur lien)
  const clearConversationNotifsLocally = useCallback((conversationId) => {
    const convStr = String(conversationId);
    setNotifications((prev) =>
      prev.filter((n) => {
        const lien = n?.lien || "";
        const msg = n?.message || "";
        return !(lien.includes(convStr) || msg.includes(convStr));
      })
    );
  }, []);

  // ✅ VERSION "BLINDÉE" anti-doublon pseudo :
  // - si le pseudo apparaît déjà N’IMPORTE OÙ dans le message => on n’ajoute pas de préfixe
  // - si le message commence par "Pseudo Pseudo ..." ou "Pseudo: Pseudo ..." => on nettoie le début
  // - sinon => on préfixe "Pseudo : message"
  const formatNotifText = useCallback((notif) => {
    const pseudo = (notif?.auteur?.pseudo || "").trim();
    const msg = (notif?.message || "").trim();

    if (!pseudo) return msg;

    const p = pseudo.toLowerCase();
    const lower = msg.toLowerCase();

    // Nettoyage safe si on reçoit déjà un doublon collé au début
    const double1 = `${pseudo} ${pseudo}`;
    const double2 = `${pseudo}: ${pseudo}`;
    if (msg.startsWith(double1)) return msg.replace(double1, pseudo);
    if (msg.startsWith(double2)) return msg.replace(double2, `${pseudo}:`);

    // ✅ Blindage : si le pseudo est déjà dans le message (début, milieu, fin),
    // on ne le rajoute pas du tout.
    if (lower.includes(p)) return msg;

    return `${pseudo} : ${msg}`;
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

        // ✅ event classique: "notification" => on refetch
        channelRef.current.subscribe("notification", () => {
          scheduleRefreshSoon();
        });

        // ✅ NOUVEL event: quand une conversation a été lue
        channelRef.current.subscribe("notif:clear-conversation", (msg) => {
          const convId = msg?.data?.conversationId;
          if (!convId) return;

          // 1) on enlève instantanément dans l’UI
          clearConversationNotifsLocally(convId);

          // 2) et on refetch bientôt pour être 100% sync
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchNotifications, scheduleRefreshSoon, clearConversationNotifsLocally]);

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
                // clic notif => tout marquer lu (comportement actuel)
                await markAllAsRead();
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