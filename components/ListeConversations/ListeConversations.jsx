
"use client";

import { useEffect, useState } from "react";
import "./ListeConversations.css"
export default function ListeConversations({ userId, onSelectConversation }) {
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    if (!userId) return;

    fetch(`/api/conversations?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        setConversations(data.conversations || []);
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

  return (
    <aside className="liste-conversations">
      {conversations.map((conv) => {
        // Trouve l'autre participant : celui qui n'est pas userId
        const autre = conv.participants.find(
          (p) => p.utilisateurId !== userId
        )?.utilisateur;

        // Récupérer le dernier message (il est inclus dans conv.messages[0])
        const dernierMsg = conv.messages[0];

        return (
          <div
            key={conv.id}
            className="conversation-item"
            onClick={() => onSelectConversation(conv.id)}
          >
            <div className="conv-avatar">
              <img
                src={autre?.photoUrl || "/default-avatar.png"}
                alt={autre?.pseudo || "Groupe"}
              />
            </div>
            <div className="conv-info">
              <div className="conv-pseudo">
                {autre ? autre.pseudo : "Groupe"}
              </div>
              <div className="conv-apercu">
                {renderApercu(dernierMsg)}
              </div>
            </div>
          </div>
        );
      })}
    </aside>
  );
}
