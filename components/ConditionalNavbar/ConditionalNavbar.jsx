// components/ConditionalNavbar.jsx
"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Navbar from "../Nav/Navbar";
import AuthNavbar from "../Nav/AuthNavbar";

export default function ConditionalNavbar() {
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();

  // ✅ Cache la nav uniquement quand une conversation est ouverte
  // /messagerie?conversationId=415
  const conversationId = searchParams?.get("conversationId");
  const hideNav = pathname === "/messagerie" && !!conversationId;
  if (hideNav) return null;

  // Si on est sur "/" ou "/connexion" ou "/inscription", on affiche AuthNavbar
  if (pathname === "/" || pathname === "/connexion" || pathname === "/inscription") {
    return <AuthNavbar />;
  }

  // Sinon on affiche la barre de navigation normale
  return <Navbar />;
}
