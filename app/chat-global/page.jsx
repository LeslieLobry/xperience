'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { io } from 'socket.io-client';

export default function ChatGlobalPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Scroll automatique en bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialiser la connexion socket
  useEffect(() => {
    if (!user) return;

    socketRef.current = io('http://localhost:4000');

    // Rejoindre la room globale
    socketRef.current.emit('join_conversation', 'global');

    // Charger les anciens messages
    fetch('/api/global-messages')
      .then((res) => res.json())
      .then((data) => setMessages(data.messages || []))
      .catch(console.error);

    // Écouter les nouveaux messages globaux
    socketRef.current.on('receive_global_message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [user]);

  const sendMessage = () => {
    if (!input.trim() || !user || !socketRef.current) return;

    const message = {
      auteurId: user.id,
      contenu: input.trim(),
      createdAt: new Date().toISOString(), // utile pour affichage instantané si backend ne renvoie pas
    };

    socketRef.current.emit('send_global_message', message);
    setInput('');
  };

  if (!user) return <p>Connectez-vous pour accéder au chat global.</p>;

  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: 20 }}>
      <h2 style={{ fontFamily: 'cursive', marginBottom: 10 }}>Chat Global</h2>
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
          <div
            key={i}
            style={{
              textAlign: msg.auteurId === user.id ? 'right' : 'left',
              marginBottom: 10,
            }}
          >
            <div>
              <b>{msg.auteurId === user.id ? 'Moi' : msg.auteur?.pseudo || `User ${msg.auteurId}`}</b> : {msg.contenu}
            </div>
            <small style={{ fontSize: 10, color: '#666' }}>
              {new Date(msg.createdAt).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </small>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <input
        type="text"
        placeholder="Votre message..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
      />
      <button
        onClick={sendMessage}
        style={{
          marginTop: 8,
          width: '100%',
          padding: 10,
          background: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
        }}
      >
        Envoyer
      </button>
    </div>
  );
}
