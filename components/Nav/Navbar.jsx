"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import logo from "../../public/images/logo.png";
import { LogIn } from "lucide-react";
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
  const [localUser, setLocalUser] = useState(user);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifCount, setNotifCount] = useState(0);
  const router = useRouter();
  const menuRef = useRef();
  const popupRef = useRef();
  const [unreadCount, setUnreadCount] = useState(0);

  // ➡️ AVATAR PRESIGNED URL
  const [presignedPhoto, setPresignedPhoto] = useState("/default.jpg");
  useEffect(() => {
    async function loadPresigned() {
      if (!localUser?.photoUrl) {
        setPresignedPhoto("/default.jpg");
        return;
      }
      if (localUser.photoUrl.startsWith("http")) {
        setPresignedPhoto(localUser.photoUrl);
        return;
      }
      try {
        const res = await fetch("/api/photos/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: localUser.photoUrl }),
        });
        const data = await res.json();
        setPresignedPhoto(data.url || "/default.jpg");
      } catch {
        setPresignedPhoto("/default.jpg");
      }
    }
    loadPresigned();
  }, [localUser?.photoUrl]);

  const fetchUnreadMessages = async () => {
    try {
      const res = await fetch("/api/messages/nonlus", {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.length);
      }
    } catch (err) {
      console.error("Erreur fetch unread messages", err);
    }
  };
  useEffect(() => {
    if (localUser) fetchUnreadMessages();
  }, [localUser]);

  useEffect(() => {
    setLocalUser(user);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
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
        setNotifCount(data.length); // si l'API renvoie seulement les non lues
      }
    } catch (err) {
      console.error("Erreur fetch notifications", err);
    }
  };

  useEffect(() => {
    if (localUser) fetchNotifications();
  }, [localUser]);

  // 🔹 Marquer UNE notification comme lue
  const markNotificationRead = async (id) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        credentials: "include",
      });
      // mise à jour locale optimiste
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setNotifCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Erreur PATCH notification", err);
    }
  };

  // (optionnel) marquer TOUT comme lu
  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        credentials: "include",
      });
      setNotifications([]);
      setNotifCount(0);
    } catch (err) {
      console.error("Erreur marquer notifications lues", err);
    }
  };

  const handleAvatarClick = () => {
    setDropdownOpen((prev) => !prev);
  };

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
        className={`burger${menuOpen ? " open" : ""}`}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <div className="line top"></div>
        <div className="line middle"></div>
        <div className="line bottom"></div>
      </div>

      <ul
        ref={menuRef}
        className={`nav-links${menuOpen ? " active" : ""}`}
      >
        {navLinks.map((link) => (
          <li
            key={link.href}
            onClick={() => {
              setMenuOpen(false);
              if (link.href === "/messagerie") setUnreadCount(0);
            }}
          >
            <Link
              href={link.href}
              className={
                link.href === "/messagerie" ? "nav-messagerie-link" : ""
              }
            >
              {link.label}
              {link.href === "/messagerie" && unreadCount > 0 && (
                <span className="messagerie-badge">{unreadCount}</span>
              )}
            </Link>
          </li>
        ))}

        {localUser?.role === "ADMIN" && (
          <li onClick={() => setMenuOpen(false)}>
            <Link href="/admin">🛠 Admin</Link>
          </li>
        )}

        {localUser ? (
          <li className="nav-avatar-wrapper">
            <div
              className="nav-avatar-container"
              onClick={handleAvatarClick}
            >
              <Image
                src={presignedPhoto}
                alt="Photo de profil"
                width={40}
                height={40}
                className="nav-avatar"
              />
              {notifCount > 0 && (
                <span className="notif-badge-on-avatar">
                  {notifCount}
                </span>
              )}
            </div>

            {dropdownOpen && (
              <div
                className="nav-combined-popup"
                ref={popupRef}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="notif-section">
                  <div className="notif-header-row">
                    <span className="notif-title">Notifications</span>
                    {notifications.length > 0 && (
                      <button
                        className="notif-mark-all-btn"
                        onClick={markAllRead}
                      >
                        Tout marquer comme lues
                      </button>
                    )}
                  </div>
                  <ul>
                    {notifications.length === 0 && (
                      <li>Aucune notification</li>
                    )}
                    {notifications.map((notif) => (
                      <li key={notif.id}>
                        {notif.lien && notif.lien.startsWith("/") ? (
                          <span
                            className="notif-link"
                            onClick={() => {
                              // on marque cette notif comme lue puis on navigue
                              markNotificationRead(notif.id);
                              setDropdownOpen(false);
                              router.push(notif.lien);
                            }}
                          >
                            {notif.message}
                          </span>
                        ) : (
                          <a
                            href={notif.lien || "#"}
                            target={notif.lien ? "_blank" : undefined}
                            rel={
                              notif.lien
                                ? "noopener noreferrer"
                                : undefined
                            }
                            onClick={() => {
                              markNotificationRead(notif.id);
                              setDropdownOpen(false);
                            }}
                          >
                            {notif.message}
                          </a>
                        )}
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
                    onClick={() => {
                      setDropdownOpen(false);
                      setMenuOpen(false);
                      handleGoTo(`/profil/${localUser.id}`);
                    }}
                    className="btn-link"
                  >
                    Mon profil
                  </button>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      setMenuOpen(false);
                      handleGoTo("/parametres");
                    }}
                    className="btn-link"
                  >
                    Paramètres
                  </button>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      setMenuOpen(false);
                      handleLogout();
                    }}
                    className="btn-dec"
                  >
                    Déconnexion
                  </button>
                </div>
              </div>
            )}
          </li>
        ) : (
          <li
            onClick={() => setMenuOpen(false)}
            title="Connexion"
          >
            <Link href="/connexion">
              <LogIn className="nav-icon" />
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}
