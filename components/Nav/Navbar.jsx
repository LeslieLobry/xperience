"use client";
import logo from "../../app/Assets/logo.png";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import "../Nav/Navbar.css";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext"

const navLinks = [
  { label: "Accueil", href: "/" },
  { label: "Mon profil", href: "/utilisateurs" },
  { label: "Événements", href: "/evenement" },
  { label: "Messagerie", href: "/messagerie" },
  { label: "À votre service", href: "/partenaire" },
];


export default function Navbar() {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/logout");
    router.refresh();
    router.push("/connexion");
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/me");
        const data = await res.json();
        if (data.success) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

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
    Bienvenue, <strong>{user.pseudo}</strong>
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

        {isAuthenticated && (
          <li
            onClick={() => {
              setMenuOpen(false);
              handleLogout();
            }}
          >
            <span className="nav-link">Déconnexion</span>
          </li>
        )}

        {!isAuthenticated && (
          <li onClick={() => setMenuOpen(false)}>
            <Link href="/connexion" className="nav-link">Connexion</Link>
          </li>
        )}
      </ul>
    </nav>
  );
}
