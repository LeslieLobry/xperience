"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import "./utilisateurs.css";

export default function AdminUtilisateurs() {
  const [user, setUser] = useState(null);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("TOUS");

  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/me", { credentials: "include" });

        if (!res.ok) {
          router.push("/connexion");
          return;
        }

        const data = await res.json();

        if (data.user?.role !== "ADMIN") {
          router.push("/accueil-page");
          return;
        }

        setUser(data.user);
        await fetchUtilisateurs();
      } catch (err) {
        console.error("Erreur auth :", err);
        router.push("/connexion");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const fetchUtilisateurs = async () => {
    try {
      const res = await fetch("/api/admin/utilisateurs", {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Erreur chargement utilisateurs");
      }

      const data = await res.json();
      setUtilisateurs(data);
    } catch (e) {
      console.error(e);
    }
  };

  const typesDisponibles = useMemo(() => {
    return [
      ...new Set(
        utilisateurs
          .map((u) => u.type)
          .filter(Boolean)
      ),
    ];
  }, [utilisateurs]);

  const utilisateursFiltres = useMemo(() => {
    const q = search.trim().toLowerCase();

    return utilisateurs.filter((u) => {
      const matchSearch =
        !q ||
        u.pseudo?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q);

      const matchType =
        typeFilter === "TOUS" || u.type === typeFilter;

      return matchSearch && matchType;
    });
  }, [utilisateurs, search, typeFilter]);

  const handleDelete = async (u) => {
    if (!window.confirm(`Supprimer le compte "${u.pseudo}" ?`)) return;

    if (user && u.id === user.id) {
      alert("Tu ne peux pas supprimer ton propre compte administrateur.");
      return;
    }

    setDeletingId(u.id);

    try {
      const res = await fetch(`/api/admin/utilisateurs/${u.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Erreur lors de la suppression");
        return;
      }

      setUtilisateurs((prev) => prev.filter((x) => x.id !== u.id));
    } catch (err) {
      console.error("Erreur suppression :", err);
      alert("Une erreur est survenue.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <p>Chargement...</p>;

  return (
    <div className="admin-utilisateurs">
      <h1>Utilisateurs</h1>

      <div className="admin-utilisateurs-filtres">
        <input
          type="text"
          placeholder="Rechercher par pseudo ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="TOUS">Tous les types</option>

          {typesDisponibles.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <table>
        <thead>
          <tr>
            <th>Pseudo</th>
            <th>Email</th>
            <th>Type</th>
            <th>Dernière connexion</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody className="body-util">
          {utilisateursFiltres.length > 0 ? (
            utilisateursFiltres.map((u) => (
              <tr key={u.id}>
                <td data-label="Pseudo">{u.pseudo}</td>

                <td data-label="Email">
                  <a href={`mailto:${u.email}`}>{u.email}</a>
                </td>

                <td data-label="Type">
                  {u.type || "Non renseigné"}
                </td>

                <td data-label="Dernière connexion">
                  {u.lastLogin
                    ? new Date(u.lastLogin).toLocaleString("fr-FR")
                    : "Jamais connecté"}
                </td>

                <td data-label="Actions">
                  <button
                    className="btn-supprimer-utilisateur"
                    onClick={() => handleDelete(u)}
                    disabled={deletingId === u.id}
                  >
                    {deletingId === u.id ? "Suppression..." : "Supprimer"}
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" style={{ textAlign: "center" }}>
                Aucun utilisateur trouvé.
              </td>
            </tr>
          )}
        </tbody>

        <tfoot>
          <tr>
            <td colSpan="5" style={{ textAlign: "right", fontWeight: "bold" }}>
              Total affiché : {utilisateursFiltres.length} / {utilisateurs.length}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}