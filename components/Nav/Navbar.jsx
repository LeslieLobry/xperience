"use client";
import React from "react";

import logo from "../../app/Assets/logo.png";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import "../Nav/Navbar.css";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { LogIn, LogOut, User } from "lucide-react";

const navLinks = [
  { label: "Accueil", href: "/accueil" },
  { label: "Événements", href: "/evenements" },
  { label: "Messagerie", href: "/messagerie" },
  { label: "Blog", href: "/blog" },
  { label: "À votre service", href: "/partenaire" },
];

export default function Navbar() {
  useEffect(() => {
    console.log("🧭 Navbar monté");
  }, []);

  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    router.push("/connexion");
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link href="/">
          <Image
            src={logo}
            alt="logo de xpérience"
            width={120}
            height={120}
            className="navbar-logo"
            priority
          />
        </Link>
        {user && <h3 className="navbar-pseudo">Bienvenue, {user.pseudo}</h3>}
      </div>

      <div
        className={`burger ${menuOpen ? "open" : ""}`}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <div className="line top"></div>
        <div className="line middle"></div>
        <div className="line bottom"></div>
      </div>

<ul className={`navLinks ${menuOpen ? "active" : ""}`}>
  {navLinks.map((link) => {
    if (link.href === "/accueil") {
      return (
        <React.Fragment key={link.href}>
          <li onClick={() => setMenuOpen(false)}>
            <Link href={link.href}>{link.label}</Link>
          </li>

          {/* L’icône User placée juste après Accueil */}
          {user && (
            <li onClick={() => setMenuOpen(false)} title="Mon profil">
              <Link href={`/profil/${user.id}`}>
                {/* <User className="nav-icon" /> */}Mon profil
              </Link>
            </li>
          )}
        </React.Fragment>
      );
    }

    return (
      <li key={link.href} onClick={() => setMenuOpen(false)}>
        <Link href={link.href}>{link.label}</Link>
      </li>
    );
  })}

  {user ? (
    <li onClick={handleLogout} title="Déconnexion">
      <LogOut className="nav-icon" />
    </li>
  ) : (
    <li onClick={() => setMenuOpen(false)} title="Connexion">
      <Link href="/connexion">
        <LogIn className="nav-icon" />
      </Link>
    </li>
  )}
</ul>
    </nav>
  );
}
