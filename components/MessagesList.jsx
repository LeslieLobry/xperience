import { useEffect, useRef } from "react";
import MessageBubble from "./ChatBox/MessageBubble";

export default function MessagesList({
  messages,
  utilisateur,
  onReact,
  typingPseudo,
  lastReads,
  hasMore,
  onLoadMore,
  onDelete,
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

  return (
    <div ref={containerRef} className="chat-messages" style={{ overflowY: "auto", flexGrow: 1 }}>
      {typingPseudo && (
        <div className="typing-indicator">{typingPseudo} est en train d’écrire...</div>
      )}

      {messages.map((msg, index) => (
        <MessageBubble
          key={msg.id}
          msg={msg}
          utilisateur={utilisateur}
          onReact={onReact}
          lastReads={lastReads}
          previousMsg={messages[index - 1]}
          onDelete={onDelete} 
        />
      ))}
      <div style={{ height: 20 }} />
    </div>
  );
}
