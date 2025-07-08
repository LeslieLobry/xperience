"use client";

import { useEffect, useState } from "react";
import { Realtime } from "ably";
import "./ListeConversations.css";
import CreateConversationModal from "../CreateConversationModal/CreateConversationModal";

const ably = new Realtime(process.env.NEXT_PUBLIC_ABLY_API_KEY);

export default function ListeConversations({ userId, onSelectConversation }) {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error("❌ Erreur chargement conversations :", err);
    }
  };

  useEffect(() => {
    if (!userId) return;

    fetchConversations();

    const channel = ably.channels.get(`notification-${userId}`);

    const handleNewMessage = () => {
      fetchConversations();
    };

    channel.subscribe("message", handleNewMessage);
    channel.subscribe("refresh-conversations", handleNewMessage);

    return () => {
      channel.unsubscribe("message", handleNewMessage);
      channel.unsubscribe("refresh-conversations", handleNewMessage);
    };
  }, [userId]);

  const handleDelete = async (id) => {
    if (!confirm("Supprimer cette conversation ?")) return;

    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (selectedId === id) {
          setSelectedId(null);
        }
        if (typeof onSelectConversation === "function") {
          onSelectConversation(null);
        }
      } else {
        const text = await res.text();
        let error;
        try {
          error = JSON.parse(text);
        } catch {
          error = { message: text || "Erreur inconnue" };
        }
        console.error("❌ Erreur suppression conversation :", error.message || error);
      }
    } catch (err) {
      console.error("❌ Erreur serveur :", err);
    }
  };

  // HANDLE SELECT = mark-as-read (POST) + badge à 0
  const handleSelect = async (id) => {
    setSelectedId(id);
    if (typeof onSelectConversation === "function") {
      onSelectConversation(id);
    }

    // Appelle la route pour marquer comme lu
    try {
      await fetch(`/api/conversations/${id}/mark-as-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      // Optimiste : badge non-lu = 0 tout de suite
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === id ? { ...conv, unreadCount: 0 } : conv
        )
      );

      // Si tu veux forcer le refresh ably sur plusieurs devices :
      // ably.channels.get(`notification-${userId}`).publish("refresh-conversations", {});
    } catch (err) {
      console.error("Erreur lors de la mise à jour des non-lus :", err);
    }
  };

  return (
    <aside className="liste-conversations">
      <div className="conversation-header">
        <h3>Conversations</h3>
        <button onClick={() => setShowModal(true)} className="new-conv-button">
          ➕ Nouvelle
        </button>
      </div>

      {conversations.length === 0 && (
        <div className="no-conversation-message">
          <p>Aucune conversation pour l’instant.</p>
          <a href="/recherche" className="start-search-link">
            Trouver des profils à contacter
          </a>
        </div>
      )}

      {conversations.map((conv) => {
        const autres = conv.participants
          .filter((p) => p.utilisateurId !== userId)
          .map((p) => p.utilisateur)
          .filter(Boolean);

        const pseudo =
          autres.length === 1
            ? autres[0].pseudo
            : autres.map((u) => u.pseudo).join(", ");

        const unreadCount = conv.unreadCount || 0;

        return (
          <div
            key={conv.id}
            className={`conversation-item ${selectedId === conv.id ? "active" : ""}`}
          >
            <div
              className="conversation-clickable"
              onClick={() => handleSelect(conv.id)}
            >
              <div className="conv-info">
                <div className="conv-pseudo">{pseudo}</div>
                {unreadCount > 0 && (
                  <span className="notif-badge">{unreadCount}</span>
                )}
              </div>
            </div>
            <button
              className="delete-conv-button"
              onClick={() => handleDelete(conv.id)}
              title="Supprimer cette conversation"
            >
              🗑️
            </button>
          </div>
        );
      })}

      {showModal && (
        <CreateConversationModal
          currentUserId={userId}
          onClose={() => setShowModal(false)}
          onCreated={(conv) => {
            setConversations((prev) => [conv, ...prev]);
            setShowModal(false);
          }}
        />
      )}
    </aside>
  );
}
