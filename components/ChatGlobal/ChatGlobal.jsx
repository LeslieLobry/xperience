import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

export default function ChatGlobal({ userId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null); // Pour autoscroll

  // Scrolle automatiquement en bas à chaque nouveau message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Callback stable pour recevoir un message
  const handleReceive = useCallback((message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io("http://localhost:4000");
    }

    // Charger les anciens messages depuis l'API
    const fetchMessages = async () => {
      const res = await fetch('/api/global-messages');
      const data = await res.json();
      setMessages(data);
    };

    fetchMessages();

    // S'abonner aux nouveaux messages
    socketRef.current.off('receive_global_message', handleReceive); // 🔁 attention au nom correct ici
    socketRef.current.on('receive_global_message', handleReceive);

    return () => {
      socketRef.current?.off('receive_global_message', handleReceive);
    };
  }, [handleReceive]);

  // Autoscroll dès qu’un message est ajouté
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;

    socketRef.current?.emit('send_global_message', {
      auteurId: userId,
      contenu: input,
    });

    setInput('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px', maxHeight: '300px' }}>
        {messages.map((m, i) => (
          <div key={m.id || i}>
            <b>{m.auteur?.pseudo || 'Moi'}:</b> {m.contenu}
            {m.createdAt && (
              <span style={{ marginLeft: 8, fontSize: '0.75em', color: 'gray' }}>
                {new Date(m.createdAt).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div style={{ display: 'flex', gap: '8px', padding: '10px' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Message public"
          style={{ flex: 1 }}
        />
        <button onClick={sendMessage}>Envoyer</button>
      </div>
    </div>
  );
}
