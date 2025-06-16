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
      const res = await fetch(`/api/conversations?userId=${userId}`);
      const data = await res.json();

      const visibles = (data.conversations || []).filter((conv) =>
        conv.participants.some((p) => p.utilisateurId === userId)
      );

      setConversations(visibles);
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
        const error = await res.json();
        console.error("❌ Erreur suppression conversation :", error);
      }
    } catch (err) {
      console.error("❌ Erreur serveur :", err);
    }
  };

  const handleSelect = (id) => {
    setSelectedId(id);
    if (typeof onSelectConversation === "function") {
      onSelectConversation(id);
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

        const avatar =
          autres.length === 1
            ? autres[0].photoUrl || "/default-avatar.png"
            : "/group-avatar.png";

        return (
          <div
            key={conv.id}
            className={`conversation-item ${selectedId === conv.id ? "active" : ""}`}
          >
            <div className="conversation-clickable" onClick={() => handleSelect(conv.id)}>
              
              <div className="conv-info">
                <div className="conv-pseudo">{pseudo}</div>
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
