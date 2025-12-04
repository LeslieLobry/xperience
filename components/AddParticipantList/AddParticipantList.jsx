import { useEffect, useState } from "react";
import "./AddParticipantList.css";

/* --------------------------------------------------------- */
/* Hook : présigne une photo à partir d'une clé S3           */
/* --------------------------------------------------------- */
function usePresignedPhoto(photoLike) {
  const [url, setUrl] = useState("/default-avatar.png");

  useEffect(() => {
    if (!photoLike) {
      setUrl("/default-avatar.png");
      return;
    }

    // Si c'est déjà une URL complète
    if (typeof photoLike === "string" && photoLike.startsWith("http")) {
      setUrl(photoLike);
      return;
    }

    // Sinon : clé S3 → on présigne
    fetch("/api/photos/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: photoLike }),
    })
      .then((res) => res.json())
      .then((data) => {
        setUrl(data?.url || "/default-avatar.png");
      })
      .catch((err) => {
        console.error("Erreur presign AddParticipantList:", err);
        setUrl("/default-avatar.png");
      });
  }, [photoLike]);

  return url;
}

/* --------------------------------------------------------- */
/* Ligne d'un utilisateur dans la liste de suggestions       */
/* --------------------------------------------------------- */
function UserSuggestion({ user, selected, onClick }) {
  // On regarde plusieurs champs possibles, mais chez toi c'est surtout photoUrl
  const photoKey =
    user.photoUrl ||
    user.photoProfil ||
    user.photo ||
    user.photo_key ||
    user.photoKey;

  const url = usePresignedPhoto(photoKey);

  return (
    <div
      className={`add-participant-suggestion ${
        selected ? "selected" : ""
      }`}
      onClick={onClick}
    >
      <img
        src={url}
        alt={user.pseudo}
        className="add-participant-avatar"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = "/default-avatar.png";
        }}
      />
      <span>{user.pseudo}</span>
    </div>
  );
}

export default function AddParticipantList({
  conversationId,
  participants,
  onClose,
  onAdded,
}) {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Chargement des utilisateurs, en excluant ceux déjà dans la conversation
  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetch("/api/utilisateur");
        const data = await res.json();

        const idsInConversation = (participants || []).map((p) => p.id);
        const users = (data.utilisateurs || []).filter(
          (u) => !idsInConversation.includes(u.id)
        );

        setUtilisateurs(users);
        setFiltered(users); // par défaut : tous
      } catch (e) {
        console.error("Erreur chargement utilisateurs:", e);
      }
    }

    loadUsers();
  }, [participants]);

  // Filtre sur le pseudo
  useEffect(() => {
    const s = search.toLowerCase();
    setFiltered(
      utilisateurs.filter((u) =>
        u.pseudo.toLowerCase().includes(s)
      )
    );
  }, [search, utilisateurs]);

  const handleAdd = async () => {
    setError("");
    if (!selectedId) return setError("Sélectionne un utilisateur !");
    setLoading(true);
    try {
      const res = await fetch(
        `/api/conversations/${conversationId}/add-participant`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIdOrPseudo: selectedId }),
        }
      );
      const data = await res.json();
      setLoading(false);
      if (data.success) {
        onAdded();
        onClose();
      } else {
        setError(data.error || "Erreur lors de l'ajout.");
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      setError("Erreur réseau.");
    }
  };

  return (
    <div className="add-participant-root">
      <input
        type="text"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setSelectedId(null);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        placeholder="Recherche rapide…"
        className="add-participant-search"
        autoComplete="off"
      />

      {/* LISTE DES UTILISATEURS (tous les filtrés, pas seulement 8) */}
      {showSuggestions && filtered.length > 0 && (
        <div className="add-participant-suggestions">
          {filtered.map((u) => (
            <UserSuggestion
              key={u.id}
              user={u}
              selected={selectedId === u.id}
              onClick={() => {
                setSelectedId(u.id);
                setSearch(u.pseudo);
                setShowSuggestions(false);
              }}
            />
          ))}
        </div>
      )}

      {showSuggestions && search && filtered.length === 0 && (
        <div className="add-participant-empty">
          Aucun utilisateur trouvé
        </div>
      )}

      <div className="add-participant-actions">
        <button
          className="btn-add-participant"
          onClick={handleAdd}
          disabled={loading || !selectedId}
        >
          {loading ? "Ajout..." : "Ajouter"}
        </button>
        <button
          className="btn-cancel-participant"
          onClick={onClose}
          disabled={loading}
        >
          Annuler
        </button>
      </div>

      {error && <div className="add-participant-error">{error}</div>}
    </div>
  );
}
