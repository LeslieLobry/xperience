"use client";
import logo from "../../app/Assets/logo.png";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import "../Nav/Navbar.css";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

const navLinks = [
  { label: "Accueil", href: "/" },
  { label: "Mon profil", href: "/utilisateurs" },
  { label: "Événements", href: "/evenement" },
  { label: "Messagerie", href: "/messagerie" },
  { label: "À votre service", href: "/partenaire" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await logout(); // Appelle le logout du contexte
    setMenuOpen(false);
    router.push("/connexion");
  };

  return (
    <nav className="navbar">
      <div className="logo">
        <Link href="/">
          <Image
            src={logo}
            alt="logo de xpérience"
            width={200}
            height={200}
            className="contenant-header-logo"
            priority
          />
        </Link>
      </div>

      {user && (
        <div className="navbar-pseudo">
          <h3>Bienvenue, {user.pseudo}</h3>
        </div>
      )}

      <div className="burger" onClick={() => setMenuOpen(!menuOpen)}>
        <div className="line"></div>
        <div className="line"></div>
        <div className="line"></div>
      </div>

      <ul className={`navLinks ${menuOpen ? "active" : ""}`}>
        {navLinks.map((link) => (
          <li key={link.href} onClick={() => setMenuOpen(false)}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}

        {user ? (
          <li onClick={handleLogout}>
            <button className="nav-link logout-button">Déconnexion</button>
          </li>
        ) : (
          <li onClick={() => setMenuOpen(false)}>
            <Link href="/connexion" className="nav-link">Connexion</Link>
          </li>
        )}
      </ul>
    </nav>
  );
}
