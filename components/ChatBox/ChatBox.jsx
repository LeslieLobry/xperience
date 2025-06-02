// components/ChatBox/ChatBox.jsx
"use client";

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import "../ChatBox/ChatBox.css";

let socket;

export default function ChatBox({ conversationId, utilisateur }) {
  const [messages, setMessages] = useState([]);
  const [nouveauTexte, setNouveauTexte] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const messagesEndRef = useRef(null);

  // ① Initialise Socket.IO dès que l'utilisateur existe
  useEffect(() => {
    if (utilisateur && !socket) {
      socket = io("http://localhost:4000"); // adapter si nécessaire
    }
  }, [utilisateur]);

  // ② Quand conversationId ou utilisateur change, on marque lecture + on charge + on écoute
  useEffect(() => {
    if (!conversationId || !utilisateur) return;

    // a) Si le socket n’était pas encore créé, on le crée avant d’émettre
    if (!socket) {
      socket = io("http://localhost:4000");
    }

    // b) Marquer la conversation comme lue
    fetch(`/api/conversations/${conversationId}/mark-as-read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: utilisateur.id }),
    })
      .then(() => {
        // Notifier la bulle pour rafraîchir son compteur
        if (socket) {
          socket.emit("refresh_unread", { userId: utilisateur.id });
        }
      })
      .catch((err) => console.error("Erreur mark-as-read :", err));

    // c) Rejoindre la room
    socket.emit("join_conversation", conversationId);

    // d) Charger l'historique des messages
    fetch(`/api/messages?conversationId=${conversationId}`)
      .then((res) => res.json())
      .then((data) => {
        setMessages(data.messages || []);
        scrollToBottom();
      })
      .catch((err) => console.error("Erreur fetch messages :", err));

    // e) Écoute des nouveaux messages
    socket.on("message_received", (msg) => {
      if (msg.conversationId === conversationId) {
        setMessages((prev) => [...prev, msg]);
        scrollToBottom();
      }
    });

    return () => {
      socket.off("message_received");
    };
  }, [conversationId, utilisateur]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // ③ Fonction d'envoi
  const handleEnvoyer = async (e) => {
    e.preventDefault();
    if (!conversationId || !utilisateur) return;

    // a) S’assurer que le socket existe avant d’émettre
    if (!socket) {
      socket = io("http://localhost:4000");
    }

    // b) Envoi d'image si sélectionnée
    if (imageFile) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result;
        const nouveauMsg = {
          conversationId,
          auteurId: utilisateur.id,
          contenu: null,
          imageUrl: base64,
          videoUrl: null,
          type: "IMAGE",
        };

        const res = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nouveauMsg),
        });
        const data = await res.json();

        if (socket) {
          socket.emit("send_message", data.message);
        }
        setImageFile(null);
      };
      reader.readAsDataURL(imageFile);
      return;
    }

    // c) Envoi de texte
    if (nouveauTexte.trim() === "") return;

    const nouveauMsg = {
      conversationId,
      auteurId: utilisateur.id,
      contenu: nouveauTexte.trim(),
      imageUrl: null,
      videoUrl: null,
      type: "TEXTE",
    };

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nouveauMsg),
    });
    const data = await res.json();

    if (socket) {
      socket.emit("send_message", data.message);
    }
    setNouveauTexte("");
  };

  return (
    <div className="chatbox-container">
      <div className="chat-messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={
              msg.auteurId === utilisateur.id
                ? "message message-sent"
                : "message message-received"
            }
          >
            {msg.type === "TEXTE" && <p>{msg.contenu}</p>}
            {msg.type === "IMAGE" && <img src={msg.imageUrl} alt="Image envoyée" />}
            {msg.type === "VIDEO" && <video src={msg.videoUrl} controls />}
            <span className="message-meta">
              {msg.auteur.pseudo} • {new Date(msg.createdAt).toLocaleTimeString()}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input" onSubmit={handleEnvoyer}>
        <input
          type="text"
          placeholder="Écrire un message…"
          value={nouveauTexte}
          onChange={(e) => setNouveauTexte(e.target.value)}
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files[0])}
        />
        <button type="submit">Envoyer</button>
      </form>
    </div>
  );
}
