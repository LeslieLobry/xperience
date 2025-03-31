"use client"

import { useState } from "react"
import Link from "next/link"
import "@/Components/Nav/Navbar.css"

const navLinks = [
  { label: "Accueil", href: "/" },
  { label: "À propos", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Contact", href: "/contact" },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="navbar">
      <div className="logo">
        <Link href="/">MonSite</Link>
      </div>

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
      </ul>
    </nav>
  )
}
