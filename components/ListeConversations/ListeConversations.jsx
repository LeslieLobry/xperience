"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Realtime } from "ably";
import "./ListeConversations.css";
import CreateConversationModal from "../CreateConversationModal/CreateConversationModal";

const ably = new Realtime(process.env.NEXT_PUBLIC_ABLY_API_KEY);
const fetcher = (url) => fetch(url).then((res) => res.json());

export default function ListeConversations({ userId, onSelectConversation }) {
  const [selectedId, setSelectedId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [newName, setNewName] = useState("");

  // SWR : fetch conversations
  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR(userId ? "/api/conversations" : null, fetcher);

  const conversations = (data?.conversations || []).filter(
    (c, idx, arr) => arr.findIndex((cc) => cc.id === c.id) === idx
  );

  // Ably = refetch conversations à chaque notif
  useEffect(() => {
    if (!userId) return;
    const channel = ably.channels.get(`notification-${userId}`);
    const handleNewMessage = () => mutate();
    channel.subscribe("message", handleNewMessage);
    channel.subscribe("refresh-conversations", handleNewMessage);
    return () => {
      channel.unsubscribe("message", handleNewMessage);
      channel.unsubscribe("refresh-conversations", handleNewMessage);
    };
  }, [userId, mutate]);

  // Suppression conversation
  const handleDelete = async (id) => {
    if (!confirm("Supprimer cette conversation ?")) return;
    await fetch(`/api/conversations/${id}`, { method: "DELETE", credentials: "include" });
    mutate();
    if (selectedId === id) {
      setSelectedId(null);
      if (typeof onSelectConversation === "function") onSelectConversation(null);
    }
  };

  // Renommage conversation
  const handleRename = async (id) => {
    const res = await fetch(`/api/conversations/${id}/rename`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: newName }),
    });
    if (res.ok) {
      setRenamingId(null);
      setNewName("");
      mutate();
    } else {
      const data = await res.json();
      alert(data.error || "Erreur lors du renommage");
    }
  };

  // Sélection + badge à 0
  const handleSelect = async (id) => {
    setSelectedId(id);
    if (typeof onSelectConversation === "function") onSelectConversation(id);
    await fetch(`/api/conversations/${id}/mark-as-read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    mutate();
  };

  if (error) {
    return <aside className="liste-conversations">Erreur de chargement...</aside>;
  }

  return (
    <aside className="liste-conversations">
      <div className="conversation-header">
        <h3>Conversations</h3>
        <button onClick={() => setShowModal(true)} className="new-conv-button">
          ➕ Nouvelle
        </button>
      </div>

      {/* Message si aucune conversation */}
      {conversations.length === 0 && !selectedId && (
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
                <div className="conv-pseudo">
                  {renamingId === conv.id ? (
                    <>
                      <input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleRename(conv.id); }}
                        autoFocus
                        style={{ width: 120, marginRight: 6 }}
                        maxLength={40}
                      />
                      <button onClick={() => handleRename(conv.id)}>OK</button>
                      <button onClick={() => { setRenamingId(null); setNewName(""); }}>Annuler</button>
                    </>
                  ) : (
                    <>
                      {conv.nom || pseudo}
                      <button
                        className="rename-conv-button"
                        onClick={e => { e.stopPropagation(); setRenamingId(conv.id); setNewName(conv.nom || ""); }}
                        title="Renommer cette conversation"
                        style={{ marginLeft: 8, fontSize: 14, background: "none", border: "none", cursor: "pointer" }}
                      >✏️</button>
                    </>
                  )}
                </div>
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
          onCreated={() => {
            mutate();
            setShowModal(false);
          }}
        />
      )}
    </aside>
  );
}
