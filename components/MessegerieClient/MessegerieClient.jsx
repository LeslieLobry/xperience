"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import ListeConversations from "../ListeConversations/ListeConversations";
import ChatBox from "../ChatBox/ChatBox";
import "../../app/messagerie/messagerie.css";

export default function MessagerieClient({ user }) {
  const searchParams = useSearchParams();
  const conversationIdParam = searchParams.get("conversationId");
  const conversationId = conversationIdParam ? parseInt(conversationIdParam) : null;

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (user?.id) setReady(true);
  }, [user]);

  const handleSelectConversation = (id) => {
    window.history.pushState({}, "", `/messagerie?conversationId=${id}`);
  };

  if (!ready) return null; // ⛔ évite le rendu prématuré

  return (
    <div className="messagerie-page">
      <ListeConversations
        userId={user.id}
        onSelectConversation={handleSelectConversation}
      />

      <div className="chat-section">
        {conversationId ? (
          <ChatBox conversationId={conversationId} utilisateur={user} />
        ) : (
          <div className="no-conversation">
            <p>Sélectionne une conversation</p>
          </div>
        )}
      </div>
    </div>
  );
}
