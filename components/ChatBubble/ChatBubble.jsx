"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";
import "./ChatBubble.css";
import Image from "next/image";
import masque from "../../public/masque.png";

export default function ChatBubble() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadPrivate, setUnreadPrivate] = useState(0);
  const [unreadGlobal, setUnreadGlobal] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [socket, setSocket] = useState(null);
  const router = useRouter();

  const sonGlobal = useRef(null);
  const sonPrive = useRef(null);

  const fetchUnreadCounts = async () => {
    if (!user?.id) return;

    try {
      const [privateRes, globalRes] = await Promise.all([
        fetch(`/api/unread-messages-count?userId=${user.id}`),
        fetch(`/api/unread-global-messages?userId=${user.id}`),
      ]);

      const { unreadCount: privateCount = 0 } = await privateRes.json();
      const { unreadGlobal = 0 } = await globalRes.json();

      setUnreadPrivate(privateCount);
      setUnreadGlobal(unreadGlobal);
      setUnreadCount(privateCount + unreadGlobal);
    } catch (err) {
      console.error("❌ Erreur compteur messages :", err);
    }
  };

  useEffect(() => {
    if (!user || socket) return;

    const newSocket = io("http://localhost:4000");
    setSocket(newSocket);
    console.log("🔌 Socket connecté");

    return () => {
      newSocket.disconnect();
      console.log("❌ Socket déconnecté");
    };
  }, [user, socket]);

  useEffect(() => {
    fetchUnreadCounts();
  }, [user?.id]);

  useEffect(() => {
    if (!user || !socket) return;

    socket.on("notification", () => {
      fetchUnreadCounts();
      sonPrive.current?.play().catch(() => {});
    });

    socket.on("refresh_unread", ({ userId }) => {
      if (userId === user.id) {
        fetchUnreadCounts();
        sonPrive.current?.play().catch(() => {});
      }
    });

    socket.on("receive_global_message", (msg) => {
      if (msg.auteurId !== user.id) {
        fetchUnreadCounts();
        sonGlobal.current?.play().catch(() => {});
      }
    });

    return () => {
      socket.off("notification");
      socket.off("refresh_unread");
      socket.off("receive_global_message");
    };
  }, [user, socket]);

  if (!user) return null;

  const handleToggleMenu = () => {
    setShowMenu(!showMenu);
    console.log("🟡 Toggle menu", !showMenu);
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
      <audio ref={sonGlobal} src="/sounds/message-global.mp3" />
      <audio ref={sonPrive} src="/sounds/message-prive.mp3" />
      
      <div className="chat-bubble-container" onClick={handleToggleMenu}>
        <Image
          src={masque}
          alt="Chat"
          width={80}
          height={60}
          className="chat-bubble-icon"
        />
        {unreadCount > 0 && (
          <span className="chat-bubble-badge">{unreadCount}</span>
        )}
      </div>

      {showMenu && (
        <div className="chat-menu">
          <button onClick={goToGlobalChat}>
            Chat global {unreadGlobal > 0 && `(${unreadGlobal})`}
          </button>
          <button onClick={goToPrivateMessages}>
            Messagerie privée {unreadPrivate > 0 && `(${unreadPrivate})`}
          </button>
        </div>
      )}
    </div>
  );
}
