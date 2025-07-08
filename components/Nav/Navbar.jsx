"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import logo from "../../public/images/logo.png";
import { LogIn, Settings } from "lucide-react";
import "../Nav/Navbar.css";

const navLinks = [
  { label: "Accueil", href: "/accueil-page" },
  { label: "Événements", href: "/evenements" },
  { label: "Messagerie", href: "/messagerie" },
  { label: "Blog", href: "/blog" },
  { label: "Nos partenaires", href: "/partenaires" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const [localUser, setLocalUser] = useState(user); // localUser pour forcer re-render
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifCount, setNotifCount] = useState(0);
  const router = useRouter();
  const menuRef = useRef();
  const popupRef = useRef();

  // Synchroniser localUser avec le user du contexte
  useEffect(() => {
    setLocalUser(user);
  }, [user]);

  // Click en dehors pour fermer menus/popup
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Fermeture popup profil/notif
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target)
      ) {
        setDropdownOpen(false);
      }
      // Fermeture menu burger mobile
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      logout();
      router.push("/connexion");
    } catch (err) {
      console.error("❌ Erreur logout :", err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications", {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setNotifCount(data.length);
      }
    } catch (err) {
      console.error("Erreur fetch notifications", err);
    }
  };

  useEffect(() => {
    if (localUser) fetchNotifications();
  }, [localUser]);

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        credentials: "include",
      });
      setNotifCount(0);
    } catch (err) {
      console.error("Erreur marquer notifications lues", err);
    }
  };

  const handleAvatarClick = () => {
    const willOpen = !dropdownOpen;
    setDropdownOpen(willOpen);
    if (willOpen && notifCount > 0) {
      setTimeout(() => {
        markAllRead();
      }, 3000);
    }
  };

  // Naviguer ET fermer le dropdown AVANT
  const handleGoTo = (href) => {
    setDropdownOpen(false);
    router.push(href);
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link href="/accueil-page">
          <Image
            src={logo}
            alt="logo xpérience"
            width={120}
            height={120}
            className="navbar-logo"
            priority
          />
        </Link>
        {localUser && (
          <h3 className="navbar-pseudo">
            Bienvenue, {localUser.pseudo}
          </h3>
        )}
      </div>

      <div
        className={`burger ${menuOpen ? "open" : ""}`}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <div className="line top"></div>
        <div className="line middle"></div>
        <div className="line bottom"></div>
      </div>

      <ul ref={menuRef} className={`navLinks ${menuOpen ? "active" : ""}`}>
        {navLinks.map((link) => (
          <li key={link.href} onClick={() => setMenuOpen(false)}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
        {localUser?.role === "ADMIN" && (
          <li onClick={() => setMenuOpen(false)}>
            <Link href="/admin">🛠 Admin</Link>
          </li>
        )}

        {localUser ? (
          <li className="nav-avatar-wrapper">
            <div className="nav-avatar-container" onClick={handleAvatarClick}>
              <Image
                src={
                  localUser.photoUrl
                    ? localUser.photoUrl.startsWith("http") ||
                      localUser.photoUrl.startsWith("/uploads")
                      ? localUser.photoUrl
                      : `/uploads/${localUser.photoUrl}`
                    : "/default.jpg"
                }
                alt="Photo de profil"
                width={40}
                height={40}
                className="nav-avatar"
              />
              {notifCount > 0 && (
                <span className="notif-badge-on-avatar">{notifCount}</span>
              )}
            </div>

            {dropdownOpen && (
              <div
                className="nav-combined-popup"
                ref={popupRef}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="notif-section">
                  <ul>
                    {notifications.length === 0 && (
                      <li>Aucune notification</li>
                    )}
                    {notifications.map((notif) => (
                      <li key={notif.id}>
                        <a
                          href={notif.lien || "#"}
                          onClick={() => setDropdownOpen(false)}
                        >
                          {notif.message}
                        </a>
                        <small>
                          {new Date(notif.createdAt).toLocaleString()}
                        </small>
                      </li>
                    ))}
                  </ul>
                </div>
                <hr />
                <div className="profil-actions">
                  <button
                    onClick={() => handleGoTo(`/profil/${localUser.id}`)}
                    className="btn-link"
                  >
                    Mon profil
                  </button>
                  <button
                    onClick={() => handleGoTo("/parametres")}
                    className="btn-link"
                  >
                  Paramètres
                  </button>
                  <button onClick={handleLogout} className="btn-dec">
                    Déconnexion
                  </button>
                </div>
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
