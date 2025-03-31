"use client"
import logo from "@/app/Assets/logo.png"
import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import "@/Components/Nav/Navbar.css"

const navLinks = [
  { label: "Accueil", href: "/" },
  { label: "Mon profil", href: "/profil" },
  { label: "Événements", href: "/evenement" },
  { label: "Messagerie", href: "/messagerie" },
  { label: "À votre service", href: "/partenaire" },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="navbar">
      <div className="logo">
        <Link href="/"><Image
                            src={logo}
                            alt="logo de xpérience"
                            width={200}
                            className="contenant-header-logo"
                        /></Link>
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
