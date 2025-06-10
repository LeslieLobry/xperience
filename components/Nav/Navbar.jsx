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

// Popup notifications simple
function NotificationsPopup({ notifications, onClose, markAllRead }) {
  return (
    <div className="notifications-popup">
      <button className="btn-mark-read" onClick={markAllRead}>
        Marquer tout comme lu
      </button>
      <ul>
        {notifications.length === 0 && <li>Aucune notification</li>}
        {notifications.map((notif) => (
          <li key={notif.id}>
            <Link href={notif.lien || "#"} onClick={onClose}>
              {notif.message}
            </Link>
            <small>{new Date(notif.createdAt).toLocaleString()}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifCount, setNotifCount] = useState(0);
  const router = useRouter();
  const dropdownRef = useRef();
  const notifRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/connexion");
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
    if (user) fetchNotifications();
  }, [user]);

  const markAllRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        credentials: "include",
      });
      if (res.ok) {
        setNotifications([]);
        setNotifCount(0);
        setNotificationsOpen(false);
      }
    } catch (err) {
      console.error("Erreur marquer notifications lues", err);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link href="/">
          <Image
            src={logo}
            alt="logo xpérience"
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
        {navLinks.map((link) => (
          <li key={link.href} onClick={() => setMenuOpen(false)}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}

        {user ? (
          <>
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
                  <Link
                    href={`/profil/${user.id}`}
                    onClick={() => setDropdownOpen(false)}
                  >
                    Mon profil
                  </Link>
                  <button onClick={handleLogout}>Déconnexion</button>
                </div>
              )}
            </li>

            <li className="nav-notif-wrapper" ref={notifRef}>
              <button
                className="notif-button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                aria-label="Notifications"
              >
                {/* Icône cloche */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path d="M8 16a2 2 0 0 0 1.985-1.75h-3.97A2 2 0 0 0 8 16zm6-6a6 6 0 1 1-12 0c0-3.175 2.099-5.88 5-6.708V2a1 1 0 1 1 2 0v1.292c2.901.828 5 3.533 5 6.708z" />
                </svg>
                {notifCount > 0 && (
                  <span className="notif-badge">{notifCount}</span>
                )}
              </button>
              {notificationsOpen && (
                <NotificationsPopup
                  notifications={notifications}
                  onClose={() => setNotificationsOpen(false)}
                  markAllRead={markAllRead}
                />
              )}
            </li>
          </>
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
