// app/admin/page.jsx
import { redirect } from "next/navigation";
import { getUserFromToken } from "../../lib/auth";
import Link from "next/link";
import "./admin.css";

export default async function AdminDashboard() {
  const user = await getUserFromToken();

  if (!user || user.role !== "ADMIN") {
    redirect("/accueil-page");
  }

  return (
    <div className="admin-dashboard">
      <h1>Tableau de bord admin</h1>

      <ul className="admin-links">
        <li><Link href="/admin/utilisateurs">👤 Gérer les utilisateurs</Link></li>
        <li><Link href="/admin/evenements">📅 Gérer les événements</Link></li>
        <li><Link href="/admin/blog">📝 Gérer les articles de blog</Link></li>
        <li><Link href="/admin/newsletters">📧 Gérer les newsletters</Link></li>
        <li><Link href="/admin/partenaires">🤝 Gérer les partenaires</Link></li>
        <li><Link href="/admin/email">📬 Envoyer un mail général</Link></li>

      </ul>
    </div>
  );
}
