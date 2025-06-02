// components/ChatBubble/ChatBubble.jsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";
import "./ChatBubble.css";

let socket;

export default function ChatBubble() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  // ① Initialiser Socket.IO une seule fois
  useEffect(() => {
    if (user && !socket) {
      socket = io("http://localhost:4000");
    }
  }, [user]);

  // ② Charger une première fois le nombre de non lus
  useEffect(() => {
    if (!user) return;

    fetch(`/api/unread-messages-count?userId=${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.unreadCount === "number") {
          setUnreadCount(data.unreadCount);
        }
      })
      .catch((err) => console.error("Erreur unreadCount :", err));
  }, [user?.id]);

  // ③ Écouter à la fois “notification” et “refresh_unread”
  useEffect(() => {
    if (!user || !socket) return;

    // a) Nouveaux messages
    socket.on("notification", () => {
      fetch(`/api/unread-messages-count?userId=${user.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (typeof data.unreadCount === "number") {
            setUnreadCount(data.unreadCount);
          }
        })
        .catch((err) => console.error("Erreur unreadCount :", err));
    });

    // b) Lecture d'une conversation
    socket.on("refresh_unread", ({ userId }) => {
      if (userId !== user.id) return;
      // Relancer le fetch dès qu'on a lu une conversation
      fetch(`/api/unread-messages-count?userId=${user.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (typeof data.unreadCount === "number") {
            setUnreadCount(data.unreadCount);
          }
        })
        .catch((err) => console.error("Erreur unreadCount :", err));
    });

    return () => {
      socket.off("notification");
      socket.off("refresh_unread");
    };
  }, [user, socket]);

  if (!user) return null;

  const handleClick = () => {
    router.push("/messagerie");
  };

  return (
    <div className="chat-bubble-container" onClick={handleClick}>
      <div className="chat-bubble-icon">💬</div>
      {unreadCount > 0 && (
        <span className="chat-bubble-badge">{unreadCount}</span>
      )}
    </div>
  );
}
