"use client";

import { useSearchParams } from "next/navigation";
import ListeConversations from "../ListeConversations/ListeConversations";
import ChatBox from "../ChatBox/ChatBox";
import "../../app/messagerie/messagerie.css"

export default function MessagerieClient({ user }) {
  const searchParams = useSearchParams();
  const conversationIdParam = searchParams.get("conversationId");
  const conversationId = conversationIdParam ? parseInt(conversationIdParam) : null;

  return (
    <div className="messagerie-page">
      <ListeConversations
        userId={user.id}
        onSelectConversation={(id) =>
          window.history.pushState({}, "", `/messagerie?conversationId=${id}`)
        }
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
