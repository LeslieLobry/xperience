import { useEffect, useState } from "react";
import "./AddParticipantList.css";

export default function AddParticipantList({ conversationId, participants, onClose, onAdded }) {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/utilisateur")
      .then(res => res.json())
      .then(data => {
        const idsInConversation = participants.map(p => p.id);
        const users = (data.utilisateurs || []).filter(u => !idsInConversation.includes(u.id));
        setUtilisateurs(users);
        setFiltered(users);
      });
  }, [participants]);

  useEffect(() => {
    setFiltered(
      utilisateurs.filter(u =>
        u.pseudo.toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [search, utilisateurs]);

  const handleAdd = async () => {
    setError("");
    if (!selectedId) return setError("Sélectionne un utilisateur !");
    setLoading(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/add-participant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIdOrPseudo: selectedId }),
      });
      const data = await res.json();
      setLoading(false);
      if (data.success) {
        onAdded();
        onClose();
      } else {
        setError(data.error || "Erreur lors de l'ajout.");
      }
    } catch (err) {
      setLoading(false);
      setError("Erreur réseau.");
    }
  };

  return (
    <div className="add-participant-root">
      <input
        type="text"
        value={search}
        onChange={e => {
          setSearch(e.target.value);
          setSelectedId(null); // reset sélection
          setShowSuggestions(true); // toujours ouvrir la liste si on tape
        }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        placeholder="Recherche rapide…"
        className="add-participant-search"
        autoComplete="off"
      />
      {/* SUGGESTIONS LIST */}
      {showSuggestions && filtered.length > 0 && (
        <div className="add-participant-suggestions">
          {filtered.slice(0, 8).map(u => (
            <div
              key={u.id}
              className="add-participant-suggestion"
              onClick={() => {
                setSelectedId(u.id);
                setSearch(u.pseudo);
                setShowSuggestions(false); // ferme la dropdown après sélection
              }}
            >
              <img src={u.photoUrl || "/default-avatar.png"} alt={u.pseudo} className="add-participant-avatar" />
              <span>{u.pseudo}</span>
            </div>
          ))}
        </div>
      )}
      {/* SI PAS DE RESULTAT */}
      {showSuggestions && search && filtered.length === 0 && (
        <div className="add-participant-empty">Aucun utilisateur trouvé</div>
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
