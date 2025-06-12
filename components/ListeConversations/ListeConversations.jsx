"use client";

import { useEffect, useState } from "react";
import "./ListeConversations.css";

export default function ListeConversations({ userId, onSelectConversation }) {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (!userId) return;

    fetch(`/api/conversations?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        const visibles = (data.conversations || []).filter((conv) =>
          conv.participants.some((p) => p.utilisateurId === userId && !p.supprimé)
        );
        setConversations(visibles);
      })
      .catch((err) => {
        console.error("Erreur chargement conversations :", err);
      });
  }, [userId]);

  const renderApercu = (message) => {
    if (!message) return "Pas encore de messages";
    if (message.type === "IMAGE") return "[Image]";
    if (message.type === "VIDEO") return "[Vidéo]";
    return message.contenu.length > 30
      ? message.contenu.slice(0, 30) + "…"
      : message.contenu;
  };

  const handleDelete = async (id) => {
    const confirmDelete = confirm("Supprimer cette conversation ?");
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (typeof onSelectConversation === "function") {
          onSelectConversation(null);
        }
        if (selectedId === id) {
          setSelectedId(null);
        }
      } else {
        console.error("Erreur suppression conversation :", await res.json());
      }
    } catch (err) {
      console.error("Erreur serveur :", err);
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
      {conversations.length === 0 && (
        <div className="no-conversation-message">
          <p>Aucune conversation pour l’instant.</p>
          <a href="/recherche" className="start-search-link">
            Trouver des profils à contacter
          </a>
        </div>
      )}

      {conversations.map((conv) => {
        const autre = conv.participants.find(
          (p) => p.utilisateurId !== userId
        )?.utilisateur;

        const pseudo = autre?.pseudo || "Utilisateur supprimé";
        const avatar = autre?.photoUrl || "/default-avatar.png";
        const dernierMsg = conv.messages[0];

        return (
          <div
            key={conv.id}
            className={`conversation-item ${selectedId === conv.id ? "active" : ""}`}
          >
            <div
              className="conversation-clickable"
              onClick={() => handleSelect(conv.id)}
            >
              <div className="conv-avatar">
                <img src={avatar} alt={pseudo} />
              </div>
              <div className="conv-info">
                <div className="conv-pseudo">{pseudo}</div>
                <div className="conv-apercu">
                  {renderApercu(dernierMsg)}
                </div>
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
    </aside>
  );
}
