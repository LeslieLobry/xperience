// components/Nav/AuthNavbar.jsx
"use client";

import Link from "next/link";
import Image from "next/image";
import Button from "../Button/Button"; 
import logo from "../../app/Assets/logo.png";
import "./AuthNavbar.css"

export default function AuthNavbar() {
  return (
    <header className="auth-navbar">
      <Link href="/">
          <Image
            src={logo}
            alt="Logo Xperience"
            width={120}
            height={120}
          />
      </Link>
      <nav className="auth-buttons">
        <Button
          title="Inscription"
          color="var(--primary-color)"
          href="/inscription"
        />
        <Button
          title="Connexion"
          color="#8c6a5d"
          href="/connexion"
        />
      </nav>
    </header>
  );
}
