'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { io } from 'socket.io-client';

let socket;

export default function ChatGlobalPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  // Initialiser la connexion socket une seule fois
  useEffect(() => {
    if (!user) return;

    socket = io('http://localhost:4000'); // adapte l'URL si besoin

    // Rejoindre la room "global"
    socket.emit('join_conversation', 'global');

    // Écouter les messages entrants
    socket.on('message_received', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    // Optionnel : charger messages historiques via API (à créer)
    fetch('/api/chat-global/messages')
      .then(res => res.json())
      .then(data => setMessages(data.messages))
      .catch(console.error);

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Scroll automatique vers le dernier message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !user) return;

    const message = {
      conversationId: 'global',
      auteurId: user.id,
      contenu: input.trim(),
      type: 'TEXTE',
      createdAt: new Date().toISOString(),
    };

    socket.emit('send_message', message);
    setMessages((prev) => [...prev, message]);
    setInput('');
  };

  if (!user) return <p>Connectez-vous pour accéder au chat global.</p>;

  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: 20 }}>
      <h2>Chat Global</h2>
      <div
        style={{
          height: 400,
          overflowY: 'auto',
          border: '1px solid #ccc',
          padding: 10,
          marginBottom: 10,
          borderRadius: 6,
          background: '#f9f9f9',
        }}
      >
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <b>{msg.auteurId === user.id ? 'Moi' : `User ${msg.auteurId}`}</b>: {msg.contenu}
            <br />
            <small style={{ fontSize: 10, color: '#666' }}>{new Date(msg.createdAt).toLocaleTimeString()}</small>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <input
        type="text"
        placeholder="Votre message..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && sendMessage()}
        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
      />
      <button onClick={sendMessage} style={{ marginTop: 8, width: '100%' }}>
        Envoyer
      </button>
    </div>
  );
}
