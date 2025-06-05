"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";
import "./ChatBubble.css";
import Image from "next/image";
import masque from "../../public/masque.png";

let socket;

export default function ChatBubble() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (user && !socket) {
      socket = io("http://localhost:4000");
    }
  }, [user]);

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

  useEffect(() => {
    if (!user || !socket) return;

    socket.on("notification", () => {
      fetch(`/api/unread-messages-count?userId=${user.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (typeof data.unreadCount === "number") {
            setUnreadCount(data.unreadCount);
          }
        });
    });

    socket.on("refresh_unread", ({ userId }) => {
      if (userId !== user.id) return;
      fetch(`/api/unread-messages-count?userId=${user.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (typeof data.unreadCount === "number") {
            setUnreadCount(data.unreadCount);
          }
        });
    });

    return () => {
      socket.off("notification");
      socket.off("refresh_unread");
    };
  }, [user, socket]);

  if (!user) return null;

  const handleToggleMenu = () => {
    setShowMenu(!showMenu);
  };

  const goToGlobalChat = () => {
    router.push("/chat-global");
    setShowMenu(false);
  };

  const goToPrivateMessages = () => {
    router.push("/messagerie");
    setShowMenu(false);
  };

  return (
    <div className="chat-bubble-wrapper">
      <div className="chat-bubble-container" onClick={handleToggleMenu}>
        <Image
          src={masque}
          alt="Chat"
          width={80}
          height={60}
          className="chat-bubble-icon"
        />
        {unreadCount > 0 && <span className="chat-bubble-badge">{unreadCount}</span>}
      </div>

      {showMenu && (
        <div className="chat-menu">
          <button onClick={goToGlobalChat}>Chat global</button>
          <button onClick={goToPrivateMessages}>Messagerie privée</button>
        </div>
      )}
    </div>
  );
}
