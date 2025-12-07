"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "./utilisateurs.css";

export default function AdminUtilisateurs() {
  const [user, setUser] = useState(null);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
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

        // ⚠️ Si ton backend renvoie { user: { ... } }
        if (data.user?.role !== "ADMIN") {
          router.push("/accueil-page");
          return;
        }

        setUser(data.user);
        fetchUtilisateurs();
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

  const handleDelete = async (u) => {
    if (!window.confirm(`Supprimer le compte "${u.pseudo}" ?`)) return;

    // Petit garde-fou côté front (le back devra aussi vérifier)
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

      // Mise à jour locale de la liste
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

      <table>
        <thead>
          <tr>
            <th>Pseudo</th>
            <th>Email</th>
            <th>Dernière connexion</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody className="body-util">
          {utilisateurs.map((u) => (
            <tr key={u.id}>
              <td data-label="Pseudo">{u.pseudo}</td>
              <td data-label="Email">
                <a href={`mailto:${u.email}`}>{u.email}</a>
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
          ))}
        </tbody>

        <tfoot>
          <tr>
            <td
              colSpan="4"
              style={{ textAlign: "right", fontWeight: "bold" }}
            >
              Total utilisateurs : {utilisateurs.length}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
