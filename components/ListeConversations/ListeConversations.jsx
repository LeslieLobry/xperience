"use client";

import { useEffect, useState } from "react";
import { Realtime } from "ably";
import "./ListeConversations.css";

const ably = new Realtime(process.env.NEXT_PUBLIC_ABLY_API_KEY);

export default function ListeConversations({ userId, onSelectConversation }) {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  // 🔁 Fonction de chargement des conversations
const fetchConversations = async () => {
  console.log("🔄 fetchConversations appelé avec userId:", userId);

  try {
    const res = await fetch(`/api/conversations?userId=${userId}`);
    const data = await res.json();
    console.log("📥 Réponse brute de /api/conversations :", data);
    console.log("✅ Conversations reçues :", data.conversations);

    const visibles = (data.conversations || []).filter((conv) =>
  conv.participants.some((p) => p.utilisateurId === userId)
);


    console.log("👀 Conversations visibles :", visibles);
    setConversations(visibles);
  } catch (err) {
    console.error("❌ Erreur chargement conversations :", err);
  }
};


  useEffect(() => {
  console.log("👤 userId reçu dans ListeConversations :", userId);

  if (!userId) return;

  // 🟡 Ajoutez cet appel direct :
  fetchConversations();

  console.log("📡 Abonnement Ably au canal notification-" + userId);
  const channel = ably.channels.get(`notification-${userId}`);

  const handleNewMessage = (msg) => {
    console.log("📩 Message reçu sur canal :", msg.name, msg.data);
    if (msg.name === "message" || msg.name === "refresh-conversations") {
      fetchConversations();
    }
  };

  channel.subscribe("message", handleNewMessage);
  channel.subscribe("refresh-conversations", handleNewMessage);

  return () => {
    console.log("❌ Désabonnement Ably du canal notification-" + userId);
    channel.unsubscribe("message", handleNewMessage);
    channel.unsubscribe("refresh-conversations", handleNewMessage);
  };
}, [userId]);


  const handleDelete = async (id) => {
    const confirmDelete = confirm("Supprimer cette conversation ?");
    if (!confirmDelete) return;

    console.log("🗑️ Suppression de la conversation :", id);
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        console.log("✅ Conversation supprimée :", id);
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (typeof onSelectConversation === "function") {
          onSelectConversation(null);
        }
        if (selectedId === id) {
          setSelectedId(null);
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
    console.log("💬 Conversation sélectionnée :", id);
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
