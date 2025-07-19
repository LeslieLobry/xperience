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
  const endRef = useRef();

  // → Fonction utilitaire pour avoir les prénoms au bon format string
  const getPrenomsCoupleString = (msg) => {
    if (msg.prenom1 && msg.prenom2) return `${msg.prenom1} & ${msg.prenom2}`;
    if (
      msg.prenomsCouple &&
      typeof msg.prenomsCouple === "object" &&
      msg.prenomsCouple.prenom1 &&
      msg.prenomsCouple.prenom2
    ) {
      return `${msg.prenomsCouple.prenom1} & ${msg.prenomsCouple.prenom2}`;
    }
    if (msg.prenomsCouple && typeof msg.prenomsCouple === "string") {
      return msg.prenomsCouple;
    }
    if (
      prenomsCouple &&
      typeof prenomsCouple === "object" &&
      prenomsCouple.prenom1 &&
      prenomsCouple.prenom2
    ) {
      return `${prenomsCouple.prenom1} & ${prenomsCouple.prenom2}`;
    }
    if (prenomsCouple && typeof prenomsCouple === "string") {
      return prenomsCouple;
    }
    return "";
  };

  // Lazy loading des anciens messages au scroll haut
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      if (container.scrollTop < 50 && hasMore) {
        onLoadMore();
      }
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [hasMore, onLoadMore]);

  // Scroll toujours en bas (dernier message)
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  let lastDate = null;

  return (
    <div ref={containerRef} className="chat-messages">
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
        let label = format(msgDate, "dd/MM/yyyy", { locale: fr });
        const now = new Date();
        if (isSameDay(msgDate, now)) label = "Aujourd'hui";
        else {
          const yesterday = new Date();
          yesterday.setDate(now.getDate() - 1);
          if (isSameDay(msgDate, yesterday)) label = "Hier";
        }

        return (
          <div key={msg.id} className="message-class">
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
              prenomsCouple={getPrenomsCoupleString(msg)}
            />
          </div>
        );
      })}
      <div ref={endRef} style={{ height: 1 }} />
      <div style={{ height: 20 }} />
    </div>
  );
}
