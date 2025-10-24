"use client";
import { useEffect } from "react";

const HINTS = [
  "recherche-sidebar.css",
  "RechercheResultats.css",
  "recherche.css",
  "/recherche/"
];

export default function CleanHeadFromRechercheCss() {
  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style')
    );
    nodes.forEach((node) => {
      const href = node.getAttribute?.("href") || "";
      const text = node.textContent || "";
      const match = HINTS.some(
        (h) => (href && href.includes(h)) || (text && text.includes(h))
      );
      if (match) {
        if (node.tagName === "LINK") {
          node.disabled = true; // plus safe : pas de flash
        } else {
          node.parentNode?.removeChild(node); // styles inline compilés
        }
      }
    });

    // Si la page Recherche posait une classe globale sur <body>, on la nettoie
    document.body.classList.remove("page-recherche", "recherche-open");
  }, []);

  return null;
}
