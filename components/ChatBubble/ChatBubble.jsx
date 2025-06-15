"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Realtime } from "ably";
import { useRouter } from "next/navigation";
import "./ChatBubble.css";
import Image from "next/image";
import masque from "../../public/masque.png";

const ably = new Realtime(process.env.NEXT_PUBLIC_ABLY_API_KEY);

export default function ChatBubble() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadPrivate, setUnreadPrivate] = useState(0);
  const [unreadGlobal, setUnreadGlobal] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
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
    if (!user) return;

    fetchUnreadCounts();

    const globalChannel = ably.channels.get("global");
    globalChannel.subscribe("message", (msg) => {
      if (msg.data.auteurId !== user.id) {
        sonGlobal.current?.play().catch(() => {});
        fetchUnreadCounts();
      }
    });

    const privateChannel = ably.channels.get(`notification-${user.id}`);
    privateChannel.subscribe("message", () => {
      sonPrive.current?.play().catch(() => {});
      fetchUnreadCounts();
    });

    return () => {
      globalChannel.unsubscribe();
      privateChannel.unsubscribe();
    };
  }, [user?.id]);

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
