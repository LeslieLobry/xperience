"use client";

import { useEffect, useMemo, useState } from "react";
import "./AdminVerification.css";

const QUICK_REASONS = [
  { key: "flou", label: "Photo floue" },
  { key: "reflet", label: "Reflet / lumière" },
  { key: "coupe", label: "Document coupé" },
  { key: "illisible", label: "Infos illisibles" },
  { key: "non_conforme", label: "Document non conforme" },
  { key: "selfie_sombre", label: "Selfie trop sombre" },
  { key: "selfie_cache", label: "Visage partiellement caché" },
  { key: "mauvais_doc", label: "Mauvais document" },
];

export default function AdminVerification() {
  const [demandes, setDemandes] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  // ✅ Modal refus
  const [refuseOpen, setRefuseOpen] = useState(false);
  const [refuseDemande, setRefuseDemande] = useState(null);
  const [refuseDocs, setRefuseDocs] = useState({
    photoCI1: true,
    selfie1: true,
    photoCI2: false,
    selfie2: false,
  });
  const [refuseComment, setRefuseComment] = useState("");
  const [selectedReasons, setSelectedReasons] = useState([]); // array de keys

  async function fetchDemandes() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/verification-identite?` +
          new URLSearchParams({
            page: page.toString(),
            pageSize: pageSize.toString(),
            statut: "EN_ATTENTE",
          })
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

  async function handleUpdate(id, statut, extra = null) {
    setUpdatingId(id);
    try {
      const payload = extra ? { id, statut, ...extra } : { id, statut };

      const res = await fetch("/api/admin/verification-identite", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Erreur mise à jour");

      setDemandes((prev) => prev.filter((d) => Number(d.id) !== Number(id)));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err) {
      alert("Erreur: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  function openRefuseModal(demande) {
    setRefuseDemande(demande);

    const isCouple = String(demande?.type || "").toUpperCase() === "COUPLE";
    setRefuseDocs({
      photoCI1: true,
      selfie1: true,
      photoCI2: isCouple ? true : false,
      selfie2: isCouple ? true : false,
    });

    setRefuseComment("");
    setSelectedReasons([]);
    setRefuseOpen(true);
  }

  function closeRefuseModal() {
    setRefuseOpen(false);
    setRefuseDemande(null);
    setRefuseComment("");
    setSelectedReasons([]);
  }

  const isCouple = useMemo(
    () => String(refuseDemande?.type || "").toUpperCase() === "COUPLE",
    [refuseDemande]
  );

  const refuseDocsArray = useMemo(() => {
    const arr = [];
    if (refuseDocs.photoCI1) arr.push("photoCI1");
    if (refuseDocs.selfie1) arr.push("selfie1");
    if (refuseDocs.photoCI2) arr.push("photoCI2");
    if (refuseDocs.selfie2) arr.push("selfie2");
    return arr;
  }, [refuseDocs]);

  const isRefuseValid = useMemo(() => {
    return refuseDocsArray.length > 0 || Boolean(refuseComment.trim()) || selectedReasons.length > 0;
  }, [refuseDocsArray, refuseComment, selectedReasons]);

  function toggleReason(key) {
    setSelectedReasons((prev) => {
      const exists = prev.includes(key);
      const next = exists ? prev.filter((k) => k !== key) : [...prev, key];

      // ✅ Optionnel : auto-remplissage du commentaire avec les raisons sélectionnées
      // On ne remplace pas si l’admin a déjà tapé un texte long, on complète.
      const labels = next
        .map((k) => QUICK_REASONS.find((r) => r.key === k)?.label)
        .filter(Boolean);

      // Si textarea vide -> on met les labels
      if (!refuseComment.trim()) {
        setRefuseComment(labels.join(" • "));
      } else {
        // si textarea contient exactement l’ancien auto-texte, on le remplace
        const prevLabels = prev
          .map((k) => QUICK_REASONS.find((r) => r.key === k)?.label)
          .filter(Boolean)
          .join(" • ");

        if (refuseComment.trim() === prevLabels) {
          setRefuseComment(labels.join(" • "));
        }
      }

      return next;
    });
  }

  function selectAllDocs() {
    setRefuseDocs({
      photoCI1: true,
      selfie1: true,
      photoCI2: isCouple ? true : false,
      selfie2: isCouple ? true : false,
    });
  }

  function unselectAllDocs() {
    setRefuseDocs({
      photoCI1: false,
      selfie1: false,
      photoCI2: false,
      selfie2: false,
    });
  }

  async function confirmRefuse() {
    if (!refuseDemande) return;

    // ✅ validation minimale (cohérent avec l’API)
    if (!isRefuseValid) {
      alert("Indique au moins un document refusé ou un motif.");
      return;
    }

    // ✅ Si commentaire vide mais raisons sélectionnées -> construire un commentaire
    let finalComment = refuseComment.trim();
    if (!finalComment && selectedReasons.length) {
      const labels = selectedReasons
        .map((k) => QUICK_REASONS.find((r) => r.key === k)?.label)
        .filter(Boolean);
      finalComment = labels.join(" • ");
    }

    await handleUpdate(refuseDemande.id, "REFUSEE", {
      documentsRefuses: refuseDocsArray,
      commentaire: finalComment || null,
    });

    closeRefuseModal();
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="admin-verif-container">
      <h2>Demandes de vérification d'identité</h2>

      {error && <p className="error">{error}</p>}
      {loading && <p>Chargement...</p>}
      {!loading && demandes.length === 0 && <p>Aucune demande.</p>}

      <table className="admin-verif-table">
        <thead>
          <tr>
            <th>Utilisateur</th>
            <th>Type</th>
            <th>Photo CI 1</th>
            <th>Selfie 1</th>
            <th>Photo CI 2</th>
            <th>Selfie 2</th>
            <th>Statut</th>
            <th>Date d'envoi</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {demandes.map((d) => (
            <tr key={d.id}>
              <td>
                {d.utilisateur
                  ? `${d.utilisateur.prenom ?? ""} ${d.utilisateur.nom?.toUpperCase() ?? ""} (${d.utilisateur.pseudo})`
                  : "Inconnu"}
              </td>

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
              <td>{new Date(d.createdAt).toLocaleString()}</td>

              <td>
                {d.statut !== "ACCEPTEE" && (
                  <button
                    onClick={() => handleUpdate(d.id, "ACCEPTEE")}
                    disabled={updatingId === d.id}
                    className="btn-accept"
                  >
                    {updatingId === d.id ? "..." : "Accepter"}
                  </button>
                )}

                {d.statut !== "REFUSEE" && (
                  <button
                    onClick={() => openRefuseModal(d)}
                    disabled={updatingId === d.id}
                    className="btn-refuse"
                  >
                    {updatingId === d.id ? "..." : "Refuser"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
          ← Précédent
        </button>
        <span>
          Page {page} / {totalPages || 1}
        </span>
        <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
          Suivant →
        </button>
      </div>

      {/* ✅ MODAL REFUS */}
      {refuseOpen && (
        <div className="admin-verif-modal-backdrop" onClick={closeRefuseModal}>
          <div className="admin-verif-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-verif-modal-head">
              <h3>Refuser la vérification</h3>
              <button className="admin-verif-modal-x" onClick={closeRefuseModal} aria-label="Fermer">
                ✕
              </button>
            </div>

            <p className="admin-verif-hint">
              Sélectionne les documents à refaire + un motif (optionnel). <br />
              <span className="admin-verif-hint-2">
                (Au moins 1 document OU un motif)
              </span>
            </p>

            {/* ✅ Actions rapides docs */}
            <div className="admin-verif-row">
              <button type="button" className="btn-ghost" onClick={selectAllDocs}>
                Tout sélectionner
              </button>
              <button type="button" className="btn-ghost" onClick={unselectAllDocs}>
                Tout désélectionner
              </button>
            </div>

            {/* ✅ Checklist documents */}
            <div className="admin-verif-docs">
              <label>
                <input
                  type="checkbox"
                  checked={refuseDocs.photoCI1}
                  onChange={(e) =>
                    setRefuseDocs((p) => ({ ...p, photoCI1: e.target.checked }))
                  }
                />
                <span>Carte d'identité (membre 1)</span>
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={refuseDocs.selfie1}
                  onChange={(e) =>
                    setRefuseDocs((p) => ({ ...p, selfie1: e.target.checked }))
                  }
                />
                <span>Selfie (membre 1)</span>
              </label>

              {isCouple && (
                <>
                  <label>
                    <input
                      type="checkbox"
                      checked={refuseDocs.photoCI2}
                      onChange={(e) =>
                        setRefuseDocs((p) => ({ ...p, photoCI2: e.target.checked }))
                      }
                    />
                    <span>Carte d'identité (membre 2)</span>
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      checked={refuseDocs.selfie2}
                      onChange={(e) =>
                        setRefuseDocs((p) => ({ ...p, selfie2: e.target.checked }))
                      }
                    />
                    <span>Selfie (membre 2)</span>
                  </label>
                </>
              )}
            </div>

            {/* ✅ Motifs rapides */}
            <div className="admin-verif-section">
              <div className="admin-verif-section-title">Motifs rapides</div>
              <div className="admin-verif-chips">
                {QUICK_REASONS.map((r) => {
                  const active = selectedReasons.includes(r.key);
                  return (
                    <button
                      key={r.key}
                      type="button"
                      className={`chip ${active ? "chip-active" : ""}`}
                      onClick={() => toggleReason(r.key)}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ✅ Commentaire */}
            <div className="admin-verif-section">
              <div className="admin-verif-section-title">Motif (optionnel)</div>
              <textarea
                value={refuseComment}
                onChange={(e) => setRefuseComment(e.target.value)}
                placeholder="Ex: photo floue, reflet, document illisible, pièce coupée..."
                rows={4}
              />
            </div>

            {/* ✅ Footer actions */}
            <div className="admin-verif-footer">
              <button type="button" onClick={closeRefuseModal} className="btn-cancel">
                Annuler
              </button>

              <button
                type="button"
                onClick={confirmRefuse}
                className="btn-refuse"
                disabled={updatingId === refuseDemande?.id || !isRefuseValid}
                title={!isRefuseValid ? "Choisis au moins un document ou indique un motif" : ""}
              >
                {updatingId === refuseDemande?.id ? "..." : "Confirmer le refus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}