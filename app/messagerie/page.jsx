// /app/messagerie/page.jsx
"use client";

import { useSearchParams } from "next/navigation";
import ListeConversations from "../../components/ListeConversations/ListeConversations";
import ChatBox from "../../components/ChatBox/ChatBox"
import { useAuth } from "../../context/AuthContext";

export default function MessageriePage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const conversationIdParam = searchParams.get("conversationId");
  const conversationId = conversationIdParam ? parseInt(conversationIdParam) : null;

  if (!user) return <p>Connecte-toi pour accéder à la messagerie.</p>;

  return (
    <div className="messagerie-page" style={{ display: "flex", height: "100vh" }}>
      <ListeConversations
        userId={user.id}
        onSelectConversation={(id) =>
          window.history.pushState({}, "", `/messagerie?conversationId=${id}`)
        }
      />

      {conversationId ? (
        <ChatBox conversationId={conversationId} utilisateur={user} />
      ) : (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p>Sélectionne une conversation</p>
        </div>
      )}
    </div>
  );
}
