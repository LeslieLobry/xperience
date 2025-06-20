"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import logo from "../../public/images/logo.png";
import { LogIn, Settings } from "lucide-react";
import "../Nav/Navbar.css";
import StatutToggle from "../StatutToggle/StatutToggle";
const navLinks = [
{ label: "Accueil", href: "/accueil-page" },
{ label: "Événements", href: "/evenements" },
{ label: "Messagerie", href: "/messagerie" },
{ label: "Blog", href: "/blog" },
{ label: "Nos partenaires", href: "/partenaires" },
];

export default function Navbar() {
const { user, logout } = useAuth();
const [menuOpen, setMenuOpen] = useState(false);
const [dropdownOpen, setDropdownOpen] = useState(false);
const [notifications, setNotifications] = useState([]);
const [notifCount, setNotifCount] = useState(0);
const router = useRouter();
const menuRef = useRef();
const popupRef = useRef();

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

const handleLogout = async () => {
try {
const res = await fetch("/api/logout", {
method: "POST",
credentials: "include",
});

const data = await res.json();
console.log("🔁 Logout API response:", res.status, data);

// 🧼 Mets à jour le state utilisateur côté client
logout();

// 🔁 Redirige vers la page de connexion
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
if (user) fetchNotifications();
}, [user]);

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

return (
<nav className="navbar">
  <div className="navbar-left">
    <Link href="/accueil-page">
    <Image src={logo} alt="logo xpérience" width={120} height={120} className="navbar-logo" priority />
    </Link>
    {user  && (
    <>
      <h3 className="navbar-pseudo">Bienvenue, {user.pseudo}</h3>
    </>
    )}

  </div>

  <div className={`burger ${menuOpen ? "open" : "" }`} onClick={()=> setMenuOpen(!menuOpen)}>
    <div className="line top"></div>
    <div className="line middle"></div>
    <div className="line bottom"></div>
  </div>

  <ul ref={menuRef} className={`navLinks ${menuOpen ? "active" : "" }`}>
    {navLinks.map((link) => (
    <li key={link.href} onClick={()=> setMenuOpen(false)}>
      <Link href={link.href}>{link.label}</Link>
    </li>
    ))}

    {user ? (
    <li className="nav-avatar-wrapper" ref={popupRef}>
      <div className="nav-avatar-container" onClick={handleAvatarClick}>
        <Image src={ user.photoUrl ? user.photoUrl.startsWith("http") || user.photoUrl.startsWith("/uploads") ?
          user.photoUrl : `/uploads/${user.photoUrl}` : "/images/default.jpg" } alt="Photo de profil" width={40}
          height={40} className="nav-avatar" />
        {notifCount > 0 && <span className="notif-badge-on-avatar">{notifCount}</span>}
      </div>

      {dropdownOpen && (
      <div className="nav-combined-popup">
        <div className="notif-section">
          <ul>
            {notifications.length === 0 && <li>Aucune notification</li>}
            {notifications.map((notif) => (
            <li key={notif.id}>
              <Link href={notif.lien || "#" } onClick={()=> setDropdownOpen(false)}>
              {notif.message}
              </Link>
              <small>{new Date(notif.createdAt).toLocaleString()}</small>
            </li>
            ))}
          </ul>
        </div>
        <hr />
        <div className="profil-actions">
          <Link href={`/profil/${user.id}`} onClick={()=> setDropdownOpen(false)}>
          Mon profil
          </Link>
          <Link href="/parametres" onClick={()=> setDropdownOpen(false)}>
          <Settings size={16} style={{ marginRight: "6px" }} />
          Paramètres
          </Link>
          <button onClick={handleLogout} className="btn-dec">
            Déconnexion
          </button>
        </div>
      </div>
      )}
    </li>
    ) : (
    <li onClick={()=> setMenuOpen(false)} title="Connexion">
      <Link href="/connexion">
      <LogIn className="nav-icon" />
      </Link>
    </li>
    )}
  </ul>
</nav>
);
}