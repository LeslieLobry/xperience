import MessageAudio from "./MessageAudio";

export default function MessageBubble({ msg, utilisateur }) {
  const isSent = msg.auteurId === utilisateur.id;
  const bubbleClass = isSent ? "message-bubble sent" : "message-bubble received";

  const pseudoAffiche = msg.auteur?.pseudo || "Utilisateur inconnu";
  const heure = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : "";

  return (
    <div className={bubbleClass}>
      {msg.type === "TEXTE" && <p>{msg.contenu}</p>}
      {msg.type === "IMAGE" && <img src={msg.imageUrl} alt="envoyée" />}
      {msg.type === "AUDIO" && (
        <MessageAudio url={msg.audioUrl} duration={msg.duree || "0:00"} />
      )}
      <span className="message-meta">{pseudoAffiche} • {heure}</span>
    </div>
  );
}
