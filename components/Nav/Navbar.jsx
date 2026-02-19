"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import logo from "../../public/images/logo.png";
import { LogIn } from "lucide-react";
import { Realtime } from "ably"; // ✅ Ably côté client
import "../Nav/Navbar.css";

const navLinks = [
  { label: "Accueil", href: "/accueil-page" },
  { label: "Événements", href: "/evenements" },
  { label: "Messagerie", href: "/messagerie" },
  { label: "Blog", href: "/blog" },
  { label: "Nos partenaires", href: "/partenaires" },
];

/* -------------------------------------------------------------------------- */
/* 🔗 Ably : singleton propre pour éviter plusieurs connexions                */
/* -------------------------------------------------------------------------- */
let ablyClient = null;

function getAblyClient() {
  if (ablyClient) return ablyClient;

  ablyClient = new Realtime({
    authUrl: "/api/ably-token", // ✅ tu l'as déjà côté backend
    echoMessages: false,
    transports: ["web_socket", "xhr_streaming", "xhr_polling"],
  });

  return ablyClient;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const [localUser, setLocalUser] = useState(user);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifCount, setNotifCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  // ✅ nouveau: loading mark-all
  const [markAllLoading, setMarkAllLoading] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  const menuRef = useRef();
  const popupRef = useRef();

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

  // 🔹 Messages non lus
  const fetchUnreadMessages = async () => {
    try {
      const res = await fetch("/api/messages/nonlus", {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(Array.isArray(data) ? data.length : 0);
      }
    } catch (err) {
      console.error("Erreur fetch unread messages", err);
    }
  };

  // 🔹 Notifications (visites, likes, nouveau message, etc.)
  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications", {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        setNotifications(arr);
        setNotifCount(arr.length); // API = seulement non lues
      }
    } catch (err) {
      console.error("Erreur fetch notifications", err);
    }
  };

  // Quand l'utilisateur change, on le recopie en local
  useEffect(() => {
    setLocalUser(user);
  }, [user]);

  /* ------------------------------------------------------------------------ */
  /* ✅ NOUVEAU : fermer menus à chaque navigation                            */
  /* ------------------------------------------------------------------------ */
  useEffect(() => {
    setDropdownOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  /* ------------------------------------------------------------------------ */
  /* 🔁 Sync propre : initial + Ably temps réel + petit fallback 60s          */
  /* ------------------------------------------------------------------------ */
  useEffect(() => {
    if (!localUser?.id) return;

    let isCancelled = false;
    let intervalId;
    let channel;

    const syncCounts = async () => {
      if (isCancelled) return;

      // On évite de poller si onglet pas visible (optimisation)
      if (
        typeof document !== "undefined" &&
        document.visibilityState !== "visible"
      ) {
        return;
      }

      try {
        if (pathname === "/messagerie") {
          setUnreadCount(0);
        } else {
          await fetchUnreadMessages();
        }
        await fetchNotifications();
      } catch (e) {
        console.error("Erreur syncCounts Navbar :", e);
      }
    };

    // 1️⃣ sync immédiat au montage / changement de page
    syncCounts();

    // 2️⃣ Ably : on écoute le canal notification-${userId}
    try {
      const client = getAblyClient();
      channel = client.channels.get(`notification-${localUser.id}`);

      channel.subscribe(() => {
        syncCounts();
      });
    } catch (e) {
      console.error("Erreur Ably Navbar :", e);
    }

    // 3️⃣ fallback
    intervalId = setInterval(syncCounts, 60000);

    // 4️⃣ quand on revient sur l'onglet → resync direct
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        syncCounts();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      isCancelled = true;
      if (intervalId) clearInterval(intervalId);
      if (channel) channel.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [localUser?.id, pathname]);

  // fermer menus si clic à l'extérieur
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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ logout
  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/connexion");
    } catch (err) {
      console.error("❌ Erreur logout :", err);
    }
  };

  // ✅ Affichage prénom/pseudo auteur (si l’API le renvoie)
  const getNotifText = useCallback((notif) => {
    const actor =
      notif?.auteur?.pseudo ||
      notif?.auteur?.prenom ||
      notif?.acteur?.pseudo ||
      notif?.acteur?.prenom ||
      "";

    // Si ton message est du style "a aimé votre profil" → on préfixe
    return actor ? `${actor} ${notif.message}` : notif.message;
  }, []);

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

  // ✅ NOUVEAU : Tout marquer comme lu
  const markAllNotificationsRead = async () => {
    if (markAllLoading) return;
    try {
      setMarkAllLoading(true);
      await fetch("/api/notifications", {
        method: "PATCH",
        credentials: "include",
      });
      // optimiste
      setNotifications([]);
      setNotifCount(0);
    } catch (err) {
      console.error("Erreur PATCH notifications (mark all)", err);
    } finally {
      setMarkAllLoading(false);
    }
  };

  const handleAvatarClick = () => {
    setDropdownOpen((prev) => !prev);
  };

  const handleGoTo = (href) => {
    setDropdownOpen(false);
    setMenuOpen(false);
    router.push(href);
  };

  // 🔹 Badge du burger
  const burgerBadgeCount = notifCount || 0;

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link href="/accueil-page">
          <Image
            src={logo}
            alt="logo xpérience"
            width={80}
            height={80}
            className="navbar-logo"
            priority
          />
        </Link>
        {localUser && (
          <h3 className="navbar-pseudo">Bienvenue, {localUser.pseudo}</h3>
        )}
      </div>

      <div
        className={`burger${menuOpen ? " open" : ""}`}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {burgerBadgeCount > 0 && (
          <span className="burger-badge">{burgerBadgeCount}</span>
        )}
        <div className="line top"></div>
        <div className="line middle"></div>
        <div className="line bottom"></div>
      </div>

      <ul ref={menuRef} className={`nav-links${menuOpen ? " active" : ""}`}>
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
            <div className="nav-avatar-container" onClick={handleAvatarClick}>
              <Image
                src={presignedPhoto}
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
                  <div className="notif-header-row">
                    <span className="notif-title">Notifications</span>

                    {/* ✅ NOUVEAU bouton "Tout lire" */}
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        className="btn-link"
                        onClick={markAllNotificationsRead}
                        disabled={markAllLoading}
                        title="Tout marquer comme lu"
                      >
                        {markAllLoading ? "..." : "Tout lire"}
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
                              markNotificationRead(notif.id);
                              setDropdownOpen(false);
                              setMenuOpen(false); // ✅ FIX : fermer la nav aussi
                              router.push(notif.lien);
                            }}
                          >
                            {getNotifText(notif)}
                          </span>
                        ) : (
                          <a
                            href={notif.lien || "#"}
                            target={notif.lien ? "_blank" : undefined}
                            rel={
                              notif.lien ? "noopener noreferrer" : undefined
                            }
                            onClick={() => {
                              markNotificationRead(notif.id);
                              setDropdownOpen(false);
                              setMenuOpen(false); // ✅ FIX : fermer la nav aussi
                            }}
                          >
                            {getNotifText(notif)}
                          </a>
                        )}

                        <small>{new Date(notif.createdAt).toLocaleString()}</small>
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
