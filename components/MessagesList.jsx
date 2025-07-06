import { useEffect, useRef } from "react";
import MessageBubble from "./ChatBox/MessageBubble";
import { format, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";

export default function MessagesList({
  messages,
  utilisateur,
  onReact,
  typingPseudo,
  lastReads,
  hasMore,
  onLoadMore,
  onDelete,
  prenomsCouple = null, 
}) {
  const containerRef = useRef();

  useEffect(() => {
    const container = containerRef.current;
    const handleScroll = () => {
      if (container.scrollTop < 50 && hasMore) {
        onLoadMore();
      }
    };
    container?.addEventListener("scroll", handleScroll);
    return () => container?.removeEventListener("scroll", handleScroll);
  }, [hasMore, onLoadMore]);
  let lastDate = null;

  return (
    <div ref={containerRef} className="chat-messages" style={{ overflowY: "auto", flexGrow: 1 }}>
      {typingPseudo && (
        <div className="typing-indicator">{typingPseudo} est en train d’écrire...</div>
      )}

      {messages.map((msg, index) => {
        const msgDate = new Date(msg.createdAt);
        let showDate = false;
        if (!lastDate || !isSameDay(msgDate, lastDate)) {
          showDate = true;
          lastDate = msgDate;
        }

        // Affichage "Aujourd'hui" / "Hier" / date classique
        let label = format(msgDate, "dd/MM/yyyy", { locale: fr });
        const now = new Date();
        if (isSameDay(msgDate, now)) label = "Aujourd'hui";
        else {
          const yesterday = new Date();
          yesterday.setDate(now.getDate() - 1);
          if (isSameDay(msgDate, yesterday)) label = "Hier";
        }

        return (
          <div key={msg.id}>
            {showDate && (
              <div className="day-separator" style={{
                textAlign: "center",
                margin: "18px 0 8px",
                color: "#a98e5d",
                fontWeight: "bold",
                opacity: 0.7,
                fontSize: "1.1em"
              }}>
                {label}
              </div>
            )}
            <MessageBubble
              msg={msg}
              utilisateur={utilisateur}
              onReact={onReact}
              lastReads={lastReads}
              previousMsg={messages[index - 1]}
              onDelete={onDelete}
              prenomsCouple={prenomsCouple} // 👈 passe la prop ici
            />
          </div>
        );
      })}
      <div style={{ height: 20 }} />
    </div>
  );
}
