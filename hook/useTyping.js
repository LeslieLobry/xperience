import { useEffect, useState } from "react";
import { Realtime } from "ably";

const ably = new Realtime(process.env.NEXT_PUBLIC_ABLY_API_KEY);

export function useTyping(conversationId, utilisateur) {
  const [isTyping, setIsTyping] = useState(false);
  const [typingPseudo, setTypingPseudo] = useState(null);

  useEffect(() => {
    const channel = ably.channels.get(`conversation-${conversationId}`);
    const handler = (msg) => {
      if (msg.data.auteurId !== utilisateur.id) {
        setTypingPseudo(msg.data.pseudo);
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 3000);
      }
    };
    channel.subscribe("typing", handler);

    return () => channel.unsubscribe("typing", handler);
  }, [conversationId]);

  const envoyerTyping = () => {
    const channel = ably.channels.get(`conversation-${conversationId}`);
    channel.publish("typing", {
      auteurId: utilisateur.id,
      pseudo: utilisateur.pseudo,
    });
  };

  return { isTyping, typingPseudo, envoyerTyping };
}
