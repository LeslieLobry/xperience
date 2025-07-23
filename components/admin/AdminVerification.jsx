"use client";

import { useEffect, useState } from "react";

export default function AdminVerification() {
  const [demandes, setDemandes] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  async function fetchDemandes() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/verification-identite?` +
          new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() })
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Erreur chargement");
      setDemandes(data.demandes);
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDemandes();
  }, [page]);

  async function handleUpdate(id, statut) {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/admin/verification-identite", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, statut }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Erreur mise à jour");
      fetchDemandes(); // refresh list
    } catch (err) {
      alert("Erreur: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <h2>Demandes de vérification d'identité</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {loading && <p>Chargement...</p>}

      {!loading && demandes.length === 0 && <p>Aucune demande.</p>}

      <table border="1" cellPadding={6} cellSpacing={0} style={{ width: "100%", marginTop: 20 }}>
        <thead>
          <tr>
            <th>Utilisateur</th>
            <th>Type</th>
            <th>Photo CI 1</th>
            <th>Selfie 1</th>
            <th>Photo CI 2</th>
            <th>Selfie 2</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {demandes.map((d) => (
            <tr key={d.id}>
              <td>{d.utilisateur?.pseudo || "Inconnu"}</td>
              <td>{d.type}</td>
              <td>
                <a href={d.photoCI1Url} target="_blank" rel="noreferrer">
                  Voir
                </a>
              </td>
              <td>
                <a href={d.selfie1Url} target="_blank" rel="noreferrer">
                  Voir
                </a>
              </td>
              <td>
                {d.photoCI2Url ? (
                  <a href={d.photoCI2Url} target="_blank" rel="noreferrer">
                    Voir
                  </a>
                ) : (
                  "-"
                )}
              </td>
              <td>
                {d.selfie2Url ? (
                  <a href={d.selfie2Url} target="_blank" rel="noreferrer">
                    Voir
                  </a>
                ) : (
                  "-"
                )}
              </td>
              <td>{d.statut}</td>
              <td>{d.commentaire || "-"}</td>
              <td>
                {d.statut !== "ACCEPTEE" && (
                  <button
                    onClick={() => handleUpdate(d.id, "ACCEPTEE")}
                    disabled={updatingId === d.id}
                    style={{ marginRight: 8 }}
                  >
                    Accepter
                  </button>
                )}
                {d.statut !== "REFUSEE" && (
                  <button
                    onClick={() => handleUpdate(d.id, "REFUSEE")}
                    disabled={updatingId === d.id}
                  >
                    Refuser
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 20 }}>
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
          ← Précédent
        </button>
        <span style={{ margin: "0 10px" }}>
          Page {page} / {totalPages}
        </span>
        <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
          Suivant →
        </button>
      </div>
    </div>
  );
}
