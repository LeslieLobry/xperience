// app/parametres/layout.jsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Settings, Key, EyeOff, Ban, Mail, Wallet, Users, Euro
} from "lucide-react";
import "./parametres.css";

const menuItems = [
  { id: "reglages", label: "Réglages", icon: <Settings size={18} /> },
  { id: "securite", label: "Sécurité", icon: <Key size={18} /> },
  // { id: "confidentialite", label: "Confidentialité", icon: <EyeOff size={18} /> },
  { id: "blocages", label: "Blocages", icon: <Ban size={18} /> },
  // { id: "alertes", label: "Alertes", icon: <Mail size={18} /> },
  { id: "abonnement", label: "Abonnement", icon: <Wallet size={18} /> },
  { id: "parrainage", label: "Parrainage", icon: <Users size={18} /> },
  // { id: "commandes", label: "Vos commandes", icon: <Euro size={18} /> },
];

export default function Layout({ children }) {
  const pathname = usePathname();

  return (
    <div className="parametres-container">
      <aside className="parametres-sidebar">
        <h3>Mes Paramètres</h3>
        <ul>
          {menuItems.map((item) => (
            <li key={item.id} className={pathname.includes(item.id) ? "active" : ""}>
              <Link href={`/parametres/${item.id}`}>
                {item.icon}
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
      <main className="parametres-content">{children}</main>
    </div>
  );
}
