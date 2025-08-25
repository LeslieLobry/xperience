"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "./utilisateurs.css";

export default function AdminUtilisateurs() {
  const [user, setUser] = useState(null);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) {
          router.push("/connexion");
          return;
        }

        const data = await res.json();

        // ⚠️ Si ton backend renvoie { user: { ... } }, utilise data.user.role
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
  }, []);

  const fetchUtilisateurs = async () => {
    const res = await fetch("/api/admin/utilisateurs");
    const data = await res.json();
    setUtilisateurs(data);
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
            <th>Rôle</th>
          </tr>
        </thead>
       <tbody className="body-util">
         <td colSpan="4" style={{ textAlign: "right", fontWeight: "bold" }}>
      Total utilisateurs : {utilisateurs.length}
    </td>
  {utilisateurs.map((u) => (
    <tr key={u.id}>
      <td data-label="Pseudo">{u.pseudo}</td>
      <td data-label="Email">
        <a href={`mailto:${u.email}`}>{u.email}</a>
      </td>
      <td data-label="Rôle">{u.role || "utilisateur"}</td>
    </tr>
  ))}
</tbody>
        <tfoot>
  <tr>
    <td colSpan="4" style={{ textAlign: "right", fontWeight: "bold" }}>
      Total utilisateurs : {utilisateurs.length}
    </td>
  </tr>
</tfoot>
      </table>
      
</div>
  );
}
