"use client";

import { useEffect, useRef, useState } from "react";
import { Realtime } from "ably";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import "./ChatGlobal.css";

const ably = new Realtime({
  key: process.env.NEXT_PUBLIC_ABLY_API_KEY,
  clientId: typeof window !== "undefined" ? `client-${Math.random()}` : undefined,
});

export default function ChatGlobal({ utilisateur }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const fetchMessages = async () => {
      const res = await fetch("/api/global-messages");
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : data.messages || []);
    };
    fetchMessages();
  }, []);

  useEffect(() => {
    if (!utilisateur?.id) return;

    fetch("/api/unread-global-messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: utilisateur.id }),
    });
  }, [utilisateur?.id]);

  useEffect(() => {
    if (!utilisateur) return;

    const channel = ably.channels.get("chat-global");
    const presence = channel.presence;

    const handleMessage = (msg) => {
      setMessages((prev) => [...prev, msg.data]);
    };

    channel.subscribe("message-global", handleMessage);

    presence.enter({
      clientId: ably.auth.clientId,
      pseudo: utilisateur.pseudo,
      photoUrl: utilisateur.photoUrl || null,
    });

    presence.subscribe("enter", (member) => {
      if (member.clientId !== ably.auth.clientId) {
        setMessages((prev) => [
          ...prev,
          {
            id: `presence-${Date.now()}-${Math.random()}`,
            type: "system",
            contenu: `${member.data.pseudo} a rejoint le chat.`,
          },
        ]);
      }
    });

    return () => {
      channel.unsubscribe("message-global", handleMessage);
      presence.leave();
    };
  }, [utilisateur]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !utilisateur) return;

    const message = {
      auteurId: utilisateur.id,
      auteur: {
        pseudo: utilisateur.pseudo,
        photoUrl: utilisateur.photoUrl || null,
      },
      contenu: input,
      createdAt: new Date().toISOString(),
    };

    const channel = ably.channels.get("chat-global");
    channel.publish("message-global", message);

    await fetch("/api/global-messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenu: message.contenu }),
    });

    setInput("");
    setShowEmojiPicker(false);
  };

  const addEmoji = (emoji) => {
    setInput((prev) => prev + emoji.native);
  };

  return (
    <div className="chat-container">
    <div className="chat-messages">
  {Array.isArray(messages) &&
    messages.map((m, i) => (
      <div key={m.id ?? `sys-${i}`} className={m.type === "system" ? "system-message" : "message-item"}>
        {m.type !== "system" ? (
          <>
            {m.auteur?.photoUrl && (
              <img src={m.auteur.photoUrl} alt="avatar" className="message-avatar" />
            )}
            <div>
              <div className="message-meta">
                <strong>{m.auteur?.pseudo || "Anonyme"}</strong>{" "}
                {m.createdAt && (
                  <span>
                    {new Date(m.createdAt).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
              <div className="message-bubble">{m.contenu}</div>
            </div>
          </>
        ) : (
          <div className="system-message">{m.contenu}</div>
        )}
      </div>
    ))}
  <div ref={messagesEndRef} />
</div>


      {showEmojiPicker && (
        <div style={{ position: "absolute", bottom: "60px", right: "10px", zIndex: 10 }}>
          <Picker data={data} onEmojiSelect={addEmoji} />
        </div>
      )}

      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Message public"
        />
        <button type="button" onClick={() => setShowEmojiPicker((prev) => !prev)}>😊</button>
        <button type="submit">Envoyer</button>
      </form>
    </div>
  );
}
