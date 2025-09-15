"use client";

import { useState } from "react";
import Select from "react-select";
import "./CreateConversationModal.css";

export default function CreateConversationModal({ currentUserId, onClose, onCreated }) {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [selection, setSelection] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");

  const me = Number(currentUserId) || 0;

  async function parseJsonSafe(res) {
    const text = await res.text();
    try { return JSON.parse(text); } catch { return { __raw: text }; }
  }

  // Charger les utilisateurs (avec cookies)
  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/utilisateur", { credentials: "include" });
        const data = await parseJsonSafe(res);
        if (!res.ok) {
          setErreur(data?.error || data?.message || `HTTP ${res.status}`);
          return;
        }
        const list = Array.isArray(data?.utilisateurs) ? data.utilisateurs : [];
        setUtilisateurs(list.filter((u) => Number(u.id) !== me));
      } catch {
        setErreur("Erreur lors du chargement des utilisateurs");
      }
    })();
  }, [me]);

  const handleCreate = async () => {
    setErreur("");
    if (!me) {
      setErreur("Utilisateur courant introuvable.");
      return;
    }
    const autres = selection.map((s) => Number(s.value)).filter(Boolean);
    if (autres.length === 0) {
      setErreur("Choisis au moins une personne");
      return;
    }

    setLoading(true);
    try {
      // 1) envoie moi + autres
      let res = await fetch("/api/conversations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantIds: Array.from(new Set([me, ...autres])) }),
      });

      // 2) si le back déduit "me" via JWT, réessaye avec seulement "autres"
      if (!res.ok && (res.status === 400 || res.status === 422)) {
        res = await fetch("/api/conversations", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participantIds: autres }),
        });
      }

      const data = await parseJsonSafe(res);

      if (res.status === 401 || res.status === 403) {
        setErreur("Non authentifié. Connecte-toi puis réessaie.");
        return;
      }
      if (!res.ok) {
        setErreur(data?.error || data?.message || (typeof data?.__raw === "string" ? data.__raw.slice(0, 200) : "Erreur"));
        return;
      }

      const convId =
        data?.conversation?.id ??
        data?.existingConversation?.id ??
        data?.conversationId ??
        data?.id ?? null;

      if (!convId) {
        setErreur("Conversation créée mais ID introuvable.");
        return;
      }

      // ✅ Garantie UX : on force la navigation avec l'ID dans l'URL
      try { onCreated?.(convId); } catch {}
      try { onClose?.(); } catch {}
      window.location.assign(`/messagerie?conversationId=${convId}`);
    } catch (e) {
      setErreur(e?.message || "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  };

  const options = utilisateurs.map((u) => ({ value: Number(u.id), label: u.pseudo }));

  return (
    <div className="modal-conversation">
      <h3>Créer une nouvelle conversation</h3>

      {erreur && <p className="erreur" style={{ color: "#d33" }}>{erreur}</p>}

      <Select
        isMulti
        options={options}
        value={selection}
        onChange={setSelection}
        placeholder="Rechercher des utilisateurs..."
        className="select-utilisateurs"
        classNamePrefix="select"
        onKeyDown={(e) => { if (e.key === "Enter" && !loading) { e.preventDefault(); handleCreate(); } }}
      />

      <div style={{ marginTop: "1rem", display: "flex", gap: 8 }}>
        <button type="button" onClick={handleCreate} disabled={loading}>
          {loading ? "Création..." : "Créer"}
        </button>
        <button type="button" onClick={onClose} className="annuler" disabled={loading}>
          Annuler
        </button>
      </div>
    </div>
  );
}
