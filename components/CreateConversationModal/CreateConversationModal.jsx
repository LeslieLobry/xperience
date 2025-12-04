"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Select, { components } from "react-select";
import "./CreateConversationModal.css";

export default function CreateConversationModal({ currentUserId, onClose, onCreated }) {
  const router = useRouter();
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [selection, setSelection] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");

  const me = Number(currentUserId) || 0;

  async function parseJsonSafe(res) {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { __raw: text };
    }
  }

  function getInitials(name) {
    if (!name) return "?";
    const parts = String(name)
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // Petit hook local pour presigner les photos (S3 → URL)
  function usePresignedPhotos(users) {
    const [photoUrls, setPhotoUrls] = useState({});

    useEffect(() => {
      if (!users || users.length === 0) {
        setPhotoUrls({});
        return;
      }

      let canceled = false;

      async function fetchAll() {
        const result = {};
        const seen = new Set();

        const uniqUsers = [];
        for (const u of users) {
          if (!u?.id) continue;
          if (seen.has(u.id)) continue;
          seen.add(u.id);
          uniqUsers.push(u);
        }

        await Promise.all(
          uniqUsers.map(async (u) => {
            if (!u.photoUrl) {
              result[u.id] = "/default.jpg";
              return;
            }

            if (u.photoUrl.startsWith("http")) {
              result[u.id] = u.photoUrl;
              return;
            }

            try {
              const res = await fetch("/api/photos/presign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key: u.photoUrl }),
              });
              const data = await res.json();
              result[u.id] = data.url || "/default.jpg";
            } catch (e) {
              console.error("[CreateConv] presign error pour user", u.id, e);
              result[u.id] = "/default.jpg";
            }
          })
        );

        if (!canceled) {
          setPhotoUrls(result);
        }
      }

      fetchAll();

      return () => {
        canceled = true;
      };
    }, [users]);

    return photoUrls;
  }

  // Charge la liste d'utilisateurs (avec cookies)
  useEffect(() => {
    (async () => {
      console.log("[CreateConv] mount, me=", me);
      try {
        const res = await fetch("/api/utilisateur", { credentials: "include" });
        const data = await parseJsonSafe(res);
        console.log("[CreateConv] GET /api/utilisateur ->", res.status, data);

        if (!res.ok) {
          setErreur(data?.error || data?.message || `HTTP ${res.status}`);
          return;
        }
        const list = Array.isArray(data?.utilisateurs) ? data.utilisateurs : [];
        setUtilisateurs(list.filter((u) => Number(u.id) !== me));
      } catch (e) {
        console.error("[CreateConv] users error:", e);
        setErreur("Erreur lors du chargement des utilisateurs");
      }
    })();
  }, [me]);

  const photoUrls = usePresignedPhotos(utilisateurs);

  const handleCreate = async () => {
    setErreur("");
    if (!me) {
      setErreur("Utilisateur courant introuvable.");
      return;
    }

    const autres = selection.map((s) => Number(s.value)).filter(Boolean);
    if (autres.length === 0) {
      setErreur("Choisis au moins une personne.");
      return;
    }

    setLoading(true);
    try {
      const firstPayload = { participantIds: Array.from(new Set([me, ...autres])) };
      console.log("[CreateConv] POST 1 payload =", firstPayload);

      let res = await fetch("/api/conversations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(firstPayload),
      });
      let data = await parseJsonSafe(res);
      console.log("[CreateConv] POST 1 ->", res.status, data);

      // si le back déduit "me" via JWT, retente avec seulement "autres"
      if (!res.ok && (res.status === 400 || res.status === 422)) {
        const secondPayload = { participantIds: autres };
        console.log("[CreateConv] POST 2 payload =", secondPayload);

        res = await fetch("/api/conversations", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(secondPayload),
        });
        data = await parseJsonSafe(res);
        console.log("[CreateConv] POST 2 ->", res.status, data);
      }

      if (res.status === 401 || res.status === 403) {
        setErreur("Non authentifié. Connecte-toi puis réessaie.");
        return;
      }
      if (!res.ok) {
        setErreur(
          data?.error ||
            data?.message ||
            (typeof data?.__raw === "string" ? data.__raw.slice(0, 200) : "Erreur")
        );
        return;
      }

      const convId =
        data?.conversation?.id ??
        data?.existingConversation?.id ??
        data?.conversationId ??
        data?.id ??
        null;

      console.log("[CreateConv] convId =", convId);

      if (!convId) {
        setErreur("Conversation créée mais ID introuvable.");
        return;
      }

      // Notifie le parent + ferme la modale
      try {
        onCreated?.(convId);
      } catch {}
      try {
        onClose?.();
      } catch {}

      // Force la navigation avec l'ID (la vue centrale lit ?conversationId)
      router.replace(`/messagerie?conversationId=${convId}`);
    } catch (e) {
      console.error("[CreateConv] create error:", e);
      setErreur(e?.message || "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  };

  // options enrichies avec l'objet utilisateur pour récupérer la photo
  const options = utilisateurs.map((u) => ({
    value: Number(u.id),
    label: u.pseudo,
    user: u,
  }));

  // ✅ Option custom avec avatar
  const CustomOption = (props) => {
    const user = props.data.user;
    const url = user ? photoUrls[user.id] : null;
    const initials = getInitials(user?.pseudo || "");
    const hasImg = url && url !== "/default.jpg";

    return (
      <components.Option {...props}>
        <div className="select-option">
          <div className="select-option-avatar">
            {hasImg ? (
              <img
                src={url}
                alt={user?.pseudo || "Photo de profil"}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/default.jpg";
                }}
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <span className="select-option-label">{props.data.label}</span>
        </div>
      </components.Option>
    );
  };

  // ✅ Label des valeurs sélectionnées avec mini-avatar
  const CustomMultiValueLabel = (props) => {
    const user = props.data.user;
    const url = user ? photoUrls[user.id] : null;
    const initials = getInitials(user?.pseudo || "");
    const hasImg = url && url !== "/default.jpg";

    return (
      <components.MultiValueLabel {...props}>
        <div className="select-multi-label">
          <div className="select-multi-avatar">
            {hasImg ? (
              <img
                src={url}
                alt={user?.pseudo || "Photo de profil"}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/default.jpg";
                }}
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <span>{props.data.label}</span>
        </div>
      </components.MultiValueLabel>
    );
  };

  return (
    <div className="modal-conversation" onClick={onClose}>
      <div
        className="modal-conversation-content"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Créer une nouvelle conversation</h3>

        {erreur && (
          <p className="erreur" style={{ color: "#d33" }}>
            {erreur}
          </p>
        )}

        <Select
          isMulti
          options={options}
          value={selection}
          onChange={setSelection}
          placeholder="Rechercher des utilisateurs..."
          className="select-utilisateurs"
          classNamePrefix="select"
          components={{
            Option: CustomOption,
            MultiValueLabel: CustomMultiValueLabel,
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading) {
              e.preventDefault();
              handleCreate();
            }
          }}
        />

        <div style={{ marginTop: "1rem", display: "flex", gap: 8 }}>
          <button type="button" onClick={handleCreate} disabled={loading}>
            {loading ? "Création..." : "Créer"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="annuler"
            disabled={loading}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
