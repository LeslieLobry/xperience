"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "././context/AuthContext";
import logo from "././public/images/logo.png";
import { LogIn } from "lucide-react";
import { Realtime } from "ably"; // ✅ Ably côté client
import "./Nav/Navbar.css";

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

  const router = useRouter();
  const pathname = usePathname();

  const menuRef = useRef();
  const popupRef = useRef();

  // ✅ anti-retour immédiat (même si l’API renvoie encore la notif)
  const clickedNotifIdsRef = useRef(new Set());

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

        // accepte tableau direct OU { items: [...] }
        const list = Array.isArray(data) ? data : data?.items || data?.notifications || [];

        // ✅ n’affiche QUE les non lues (et jamais celles déjà cliquées côté front)
        const unreadOnly = list
          .filter((n) => n?.lu === false) // 👈 le but : qu’une notif "vue" ne revienne plus
          .filter((n) => !clickedNotifIdsRef.current.has(n?.id));

        setNotifications(unreadOnly);
        setNotifCount(unreadOnly.length);
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
          // On considère les messages comme "vus" côté front
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

    // 3️⃣ petit fallback : resync toutes les 60s au cas où
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

  // ✅ version corrigée : on s'appuie sur logout() du contexte, une seule fois
  const handleLogout = async () => {
    try {
      await logout(); // fait /api/logout + reset des states
      router.replace("/connexion");
    } catch (err) {
      console.error("❌ Erreur logout :", err);
    }
  };

  // 🔹 Marquer UNE notification comme lue (✅ optimiste : elle disparaît immédiatement)
  const markNotificationRead = async (id) => {
    if (!id) return;

    // ✅ on mémorise l’ID pour éviter qu’elle revienne via un refresh immédiat
    clickedNotifIdsRef.current.add(id);

    // ✅ mise à jour locale immédiate
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setNotifCount((prev) => Math.max(0, prev - 1));

    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        credentials: "include",
      });
    } catch (err) {
      console.error("Erreur PATCH notification", err);
      // on ne ré-affiche pas (tu voulais qu'elle disparaisse dès le clic)
    }
  };

  const handleAvatarClick = () => {
    setDropdownOpen((prev) => !prev);
  };

  const handleGoTo = (href) => {
    setDropdownOpen(false);
    router.push(href);
  };

  // 🔹 Badge du burger : même comportement pour message / visite / like
  const burgerBadgeCount = notifCount || 0;

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
          <h3 className="navbar-pseudo">Bienvenue, {localUser.pseudo}</h3>
        )}
      </div>

      <div
        className={`burger${menuOpen ? " open" : ""}`}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {/* 🔴 Badge sur le burger */}
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
              className={link.href === "/messagerie" ? "nav-messagerie-link" : ""}
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
                            onClick={async () => {
                              // ✅ on marque comme lue (elle disparaît) puis on navigue
                              await markNotificationRead(notif.id);
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
                            rel={notif.lien ? "noopener noreferrer" : undefined}
                            onClick={async () => {
                              await markNotificationRead(notif.id);
                              setDropdownOpen(false);
                            }}
                          >
                            {notif.message}
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
