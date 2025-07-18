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
  const [renamingId, setRenamingId] = useState(null); 
  const [newName, setNewName] = useState("");

  // Déduplication lors du fetch
  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      // Déduplication ici
      const uniqueConvs = [];
      const ids = new Set();
      (data.conversations || []).forEach((c) => {
        if (!ids.has(c.id)) {
          ids.add(c.id);
          uniqueConvs.push(c);
        }
      });
      setConversations(uniqueConvs);
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

  const handleRename = async (id) => {
    try {
      const res = await fetch(`/api/conversations/${id}/rename`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: newName }),
      });
      const data = await res.json();
      if (res.ok) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, nom: data.conversation.nom } : c
          )
        );
        setRenamingId(null);
        setNewName("");
      } else {
        alert(data.error || "Erreur lors du renommage");
      }
    } catch (err) {
      alert("Erreur réseau");
    }
  };

  // HANDLE SELECT = mark-as-read (POST) + badge à 0
  const handleSelect = async (id) => {
    setSelectedId(id);
    if (typeof onSelectConversation === "function") {
      onSelectConversation(id);
    }

    try {
      await fetch(`/api/conversations/${id}/mark-as-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === id ? { ...conv, unreadCount: 0 } : conv
        )
      );
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
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleRename(conv.id); }}
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
    onCreated={() => {           // <-- PAS d'argument ici !
      fetchConversations();      // <-- On refetch à chaque création
      setShowModal(false);
    }}
  />
)}
    </aside>
  );
}
