import MessageAudio from "../MessageAudio/MessageAudio";

export default function MessageBubble({ msg, utilisateur, previousMsg, lastReads }) {
  const isOwn = msg.auteurId === utilisateur.id;
  const showAuthorInfo =
    !isOwn &&
    (!previousMsg || previousMsg.auteurId !== msg.auteurId);

  const heure = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";

  // Statut du message (envoyé / reçu / vu)
  let statutTexte = "";
  if (isOwn && lastReads) {
    const autresLecteurs = lastReads.filter((r) => r.utilisateurId !== utilisateur.id);
    const lus = autresLecteurs.filter(r => r.lastReadAt && new Date(r.lastReadAt) > new Date(msg.createdAt));

    if (lus.length === autresLecteurs.length && lus.length > 0) {
      statutTexte = "✔✔ Vu";
    } else if (lus.length > 0) {
      statutTexte = "✔✔ Reçu";
    } else {
      statutTexte = "✔ Envoyé";
    }
  }
 
  return (
    <div className={`message-bubble ${isOwn ? "own" : "other"}`}>
      {showAuthorInfo && (
        <div className="author-info">
          <img
            src={msg.auteur?.photoUrl || "/default-avatar.png"}
            alt={msg.auteur?.pseudo}
            className="author-avatar"
          />
          <span className="author-name">{msg.auteur?.pseudo}</span>
        </div>
      )}

      {msg.type === "IMAGE" && msg.imageUrl ? (
        <img src={msg.imageUrl} alt="image envoyée" className="message-image" />
      ) : msg.type === "AUDIO" && msg.audioUrl ? (
        <MessageAudio url={msg.audioUrl} duration={msg.duree || "0:00"} />
      ) : (
        <p className="message-text">{msg.contenu}</p>
      )}

      <div className="message-meta">
        <span className="message-time">{heure}</span>
        {isOwn && <span className="message-status">{statutTexte}</span>}
      </div>
    </div>
  );
}
