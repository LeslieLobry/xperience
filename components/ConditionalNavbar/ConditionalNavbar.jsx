// components/ConditionalNavbar.jsx
"use client";

import { usePathname } from "next/navigation";
import Navbar from "../Nav/Navbar";
import AuthNavbar from "../Nav/AuthNavbar";

export default function ConditionalNavbar() {
  const pathname = usePathname();

  // Si on est sur "/" ou "/connexion" ou "/inscription", on affiche AuthNavbar
  if (pathname === "/" || pathname === "/connexion" || pathname === "/inscription") {
    return <AuthNavbar />;
  }

  // Sinon on affiche la barre de navigation normale
  return <Navbar />;
}
