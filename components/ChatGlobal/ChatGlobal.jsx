import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io(); // adapte l’url si besoin

export default function ChatGlobal({ userId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    // Charger les messages initiaux
    fetch('/api/global-messages')
      .then(res => res.json())
      .then(setMessages);

    // Écouter les nouveaux messages
    socket.on('receiveGlobalMessage', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.off('receiveGlobalMessage');
    };
  }, []);

  const sendMessage = () => {
    if (!input.trim()) return;
    socket.emit('sendGlobalMessage', { auteurId: userId, contenu: input });
    setInput('');
  };

  return (
    <div>
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {messages.map(m => (
          <div key={m.id}><b>{m.auteur.pseudo}:</b> {m.contenu}</div>
        ))}
      </div>
      <input value={input} onChange={e => setInput(e.target.value)} placeholder="Message public" />
      <button onClick={sendMessage}>Envoyer</button>
    </div>
  );
}
