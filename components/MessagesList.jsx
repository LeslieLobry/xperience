import MessageBubble from "./ChatBox/MessageBubble";

export default function MessagesList({ messages, utilisateur, onReact, typingPseudo, lastReads }) {
  return (
    <div className="chat-messages">
      {typingPseudo && (
        <div className="typing-indicator">
          {typingPseudo} est en train d’écrire...
        </div>
      )}

      {messages.map((msg, index) => (
        <MessageBubble
          key={msg.id}
          msg={msg}
          utilisateur={utilisateur}
          onReact={onReact}
          lastReads={lastReads}                   
          previousMsg={messages[index - 1]}   
        />
      ))}
      <div style={{ height: 20 }} />
    </div>
  );
}
