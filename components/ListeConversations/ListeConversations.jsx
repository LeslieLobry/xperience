"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";         // 👈
import useSWR from "swr";
import { Realtime } from "ably";
import "./ListeConversations.css";
import CreateConversationModal from "../CreateConversationModal/CreateConversationModal";

const ably = new Realtime(process.env.NEXT_PUBLIC_ABLY_API_KEY);

// fetcher avec cookies
const safeFetcher = async (url) => {
  const res = await fetch(url, { credentials: "include" });
  const txt = await res.text();
  let data; try { data = JSON.parse(txt); } catch { data = { __raw: txt }; }
  if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  return data;
};

export default function ListeConversations({ userId, onSelectConversation }) {
  const router = useRouter();                         // 👈
  const [selectedId, setSelectedId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [newName, setNewName] = useState("");

  const { data, error, isLoading, mutate } = useSWR(
    userId ? "/api/conversations" : null,
    safeFetcher,
    { revalidateOnFocus: true }
  );

  const rawConversations = data?.conversations || [];
  const conversations = useMemo(
    () => rawConversations.filter((c, i, arr) => arr.findIndex(cc => cc.id === c.id) === i),
    [rawConversations]
  );

  useEffect(() => {
    if (!userId) return;
    const channel = ably.channels.get(`notification-${userId}`);
    const refresh = () => mutate();
    channel.subscribe("message", refresh);
    channel.subscribe("refresh-conversations", refresh);
    return () => {
      channel.unsubscribe("message", refresh);
      channel.unsubscribe("refresh-conversations", refresh);
    };
  }, [userId, mutate]);

  const handleDelete = async (id) => {
    if (!confirm("Supprimer cette conversation ?")) return;
    await fetch(`/api/conversations/${id}`, { method: "DELETE", credentials: "include" }).catch(()=>{});
    await mutate();
    if (selectedId === id) {
      setSelectedId(null);
      onSelectConversation?.(null);
      router.replace("/messagerie");                 // 👈 plus d’ID dans l’URL
    }
  };

  const handleRename = async (id) => {
    const res = await fetch(`/api/conversations/${id}/rename`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: newName }),
    });
    if (res.ok) {
      setRenamingId(null); setNewName("");
      await mutate();
    } else {
      let msg = "Erreur lors du renommage";
      try { const j = await res.json(); msg = j?.error || j?.message || msg; } catch {}
      alert(msg);
    }
  };

  // 👉 IMPORTANT : on pousse l'ID dans l'URL, car la vue centrale lit ?conversationId
  const handleSelect = async (id) => {
    setSelectedId(id);
    onSelectConversation?.(id);
    router.replace(`/messagerie?conversationId=${id}`); // 👈
    await fetch(`/api/conversations/${id}/mark-as-read`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    }).catch(()=>{});
    mutate();
  };

  if (error) {
    return <aside className="liste-conversations">Erreur de chargement des conversations.</aside>;
  }

  return (
    <aside className="liste-conversations">
      <div className="conversation-header">
        <h3>Conversations</h3>
        <button onClick={() => setShowModal(true)} className="new-conv-button">➕ Nouvelle</button>
      </div>

      {conversations.length === 0 && !selectedId && (
        <div className="no-conversation-message">
          <p>Aucune conversation pour l’instant.</p>
          <a href="/recherche" className="start-search-link">Trouver des profils à contacter</a>
        </div>
      )}

      {conversations.map((conv) => {
        const autres = (conv.participants || [])
          .filter(p => Number(p.utilisateurId) !== Number(userId)) // 👈 compare en Number
          .map(p => p.utilisateur)
          .filter(Boolean);
        const pseudo = autres.length === 1 ? autres[0].pseudo : autres.map(u => u.pseudo).join(", ");
        const unreadCount = conv.unreadCount || 0;

        return (
          <div key={conv.id} className={`conversation-item ${selectedId === conv.id ? "active" : ""}`}>
            <div className="conversation-clickable" onClick={() => handleSelect(conv.id)}>
              <div className="conv-info">
                <div className="conv-pseudo">
                  {renamingId === conv.id ? (
                    <>
                      <input
                        value={newName}
                        onChange={(e)=>setNewName(e.target.value)}
                        onKeyDown={(e)=>{ if (e.key==="Enter") handleRename(conv.id); }}
                        autoFocus style={{ width:120, marginRight:6 }} maxLength={40}
                      />
                      <button onClick={()=>handleRename(conv.id)}>OK</button>
                      <button onClick={()=>{ setRenamingId(null); setNewName(""); }}>Annuler</button>
                    </>
                  ) : (
                    <>
                      {conv.nom || pseudo}
                      <button
                        className="rename-conv-button"
                        onClick={(e)=>{ e.stopPropagation(); setRenamingId(conv.id); setNewName(conv.nom || ""); }}
                        title="Renommer cette conversation"
                        style={{ marginLeft:8, fontSize:14, background:"none", border:"none", cursor:"pointer" }}
                      >✏️</button>
                    </>
                  )}
                </div>
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </div>
            </div>
            <button className="delete-conv-button" onClick={()=>handleDelete(conv.id)} title="Supprimer cette conversation">🗑️</button>
          </div>
        );
      })}

      {showModal && (
        <CreateConversationModal
          currentUserId={userId}
          onClose={() => setShowModal(false)}
          onCreated={async (newConvId) => {
            await mutate();
            if (newConvId) {
              setSelectedId(newConvId);
              onSelectConversation?.(newConvId);
              router.replace(`/messagerie?conversationId=${newConvId}`); // 👈
            }
            setShowModal(false);
          }}
        />
      )}
    </aside>
  );
}
