"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import RechercheSidebar from "../RechercheSidebar/RechercheSidebar";

const DEFAULT_RAYON = 20;

export default function RechercheWrapper() {
  const router = useRouter();

  // anti-rafale (vocal / multi change)
  const debounceRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  const handleSearch = useCallback(
    (formRaw) => {
      // ✅ on ne mute jamais l’objet reçu
      const form = { ...(formRaw || {}) };

      // force bool si string
      if (typeof form.autourDeMoi === "string") {
        form.autourDeMoi = form.autourDeMoi === "true";
      }

      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const query = new URLSearchParams();

        Object.entries(form).forEach(([key, value]) => {
          // ✅ IMPORTANT : jamais lat/lng dans l’URL
          if (key === "latitude" || key === "longitude") return;

          // ignore vides
          if (
            (key === "rayon" || key === "ageMin" || key === "ageMax") &&
            (value === "" || value == null)
          )
            return;

          if (Array.isArray(value)) {
            value.forEach((v) => {
              if (v !== undefined && v !== null && v !== "") query.append(key, String(v));
            });
          } else if (typeof value === "boolean") {
            // ✅ on écrit "true" seulement si true
            if (value) query.set(key, "true");
          } else if (value !== undefined && value !== null && value !== "") {
            query.set(key, String(value));
          }
        });

        // ✅ Sécurité autourDeMoi
        if (form.autourDeMoi) {
          // force rayon si pas fourni
          const r = Number(form.rayon || DEFAULT_RAYON);
          query.set("autourDeMoi", "true");
          query.set("rayon", String(r));
          query.delete("localisation");
        }

        router.push("/recherche?" + query.toString());
      }, 200);
    },
    [router]
  );

  return <RechercheSidebar onSearch={handleSearch} />;
}
