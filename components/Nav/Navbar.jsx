"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import logo from "../../app/Assets/logo.png";
import { LogIn } from "lucide-react";
import "../Nav/Navbar.css";

const navLinks = [
  { label: "Accueil", href: "/accueil" },
  { label: "Événements", href: "/evenements" },
  { label: "Messagerie", href: "/messagerie" },
  { label: "Blog", href: "/blog" },
  { label: "À votre service", href: "/partenaire" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/connexion");
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link href="/">
          <Image src={logo} alt="logo xpérience" width={120} height={120} className="navbar-logo" priority />
        </Link>
        {user && <h3 className="navbar-pseudo">Bienvenue, {user.pseudo}</h3>}
      </div>

      <div className={`burger ${menuOpen ? "open" : ""}`} onClick={() => setMenuOpen(!menuOpen)}>
        <div className="line top"></div>
        <div className="line middle"></div>
        <div className="line bottom"></div>
      </div>

      <ul className={`navLinks ${menuOpen ? "active" : ""}`}>
        {navLinks.map((link) => (
          <li key={link.href} onClick={() => setMenuOpen(false)}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}

        {user ? (
          <li className="nav-avatar-wrapper" ref={dropdownRef}>
            <Image
              src={user.photoUrl || "/default-avatar.png"}
              alt="Photo de profil"
              width={40}
              height={40}
              className="nav-avatar"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            />
            {dropdownOpen && (
              <div className="nav-dropdown">
                <Link href={`/profil/${user.id}`} onClick={() => setDropdownOpen(false)}>Mon profil</Link>
                <button onClick={handleLogout}>Déconnexion</button>
              </div>
            )}
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
