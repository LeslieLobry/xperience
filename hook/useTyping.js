import { useEffect, useState, useRef } from "react";
import { Realtime } from "ably";

const ably = new Realtime(process.env.NEXT_PUBLIC_ABLY_API_KEY);

export function useTyping(conversationId, utilisateur) {
  const [isTyping, setIsTyping] = useState(false);
  const [typingPseudo, setTypingPseudo] = useState(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!conversationId || !utilisateur?.id) return;
    const channel = ably.channels.get(`conversation-${conversationId}`);

    const handler = (msg) => {
      console.log("Typing received:", msg.data);
      if (msg.data.auteurId !== utilisateur.id) {
        setTypingPseudo(msg.data.pseudo);
        setIsTyping(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setIsTyping(false), 2000);
      }
    };

    channel.subscribe("typing", handler);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      channel.unsubscribe("typing", handler);
    };
  }, [conversationId, utilisateur?.id]);

  const envoyerTyping = () => {
    if (!conversationId || !utilisateur?.id) return;
    const channel = ably.channels.get(`conversation-${conversationId}`);
    channel.publish("typing", {
      auteurId: utilisateur.id,
      pseudo: utilisateur.pseudo,
    });
  };

  return { isTyping, typingPseudo, envoyerTyping };
}
