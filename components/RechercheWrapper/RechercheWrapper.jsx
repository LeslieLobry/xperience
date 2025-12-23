"use client";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import RechercheSidebar from "../RechercheSidebar/RechercheSidebar";

const DEFAULT_RAYON = 20;

export default function RechercheWrapper() {
  const router = useRouter();

  // ✅ évite navigation à chaque frappe (1 lettre puis blur)
  const debounceRef = useRef(null);
  const lastUrlRef = useRef("");

  const navigate = (url) => {
    // évite de re-naviguer si URL identique
    if (lastUrlRef.current === url) return;
    lastUrlRef.current = url;

    // ✅ replace évite de spam l’historique + moins agressif que push
    router.replace(url, { scroll: false });
  };

  const handleSearch = (formRaw) => {
    const form = { ...formRaw };

    console.log(
      "[handleSearch] Reçu :",
      form,
      typeof form.autourDeMoi,
      form.latitude,
      form.longitude
    );
    console.log("[handleSearch] Reçu :", form);

    // PATCH : force autourDeMoi en booléen si c'est une string (cas vocal)
    if (typeof form.autourDeMoi === "string") {
      form.autourDeMoi = form.autourDeMoi === "true";
    }
    console.log(
      "handleSearch appelé avec :",
      form,
      "typeof autourDeMoi:",
      typeof form.autourDeMoi
    );

    // ✅ Debounce global (très important pour pouvoir taper normalement)
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      // --- Si autourDeMoi ---
      if (form.autourDeMoi) {
        if (!navigator.geolocation) {
          alert("La géolocalisation n'est pas supportée !");
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            console.log(
              "Position GPS récupérée :",
              pos.coords.latitude,
              pos.coords.longitude
            );

            const latitude = pos.coords.latitude;
            const longitude = pos.coords.longitude;

            const query = new URLSearchParams();
            Object.entries(form).forEach(([key, value]) => {
              if (Array.isArray(value)) value.forEach((v) => query.append(key, v));
              else if (value !== undefined && value !== null && value !== "")
                query.append(key, String(value));
            });

            query.set("latitude", String(latitude));
            query.set("longitude", String(longitude));

            // ✅ FIX: "rayon" n'existait pas -> on prend form.rayon ou default
            query.set("rayon", String(form.rayon || DEFAULT_RAYON));

            navigate("/recherche?" + query.toString());
          },
          () => {
            alert("Impossible de récupérer ta position géographique !");
          }
        );
        return;
      }

      // --- Sinon (recherche classique) ---
      const query = new URLSearchParams();
      Object.entries(form).forEach(([key, value]) => {
        if (Array.isArray(value)) value.forEach((v) => query.append(key, v));
        else if (value !== undefined && value !== null && value !== "")
          query.append(key, String(value));
      });

      navigate("/recherche?" + query.toString());
    }, 500); // ✅ 500ms = tu peux taper tranquille sans perdre le focus
  };

  return <RechercheSidebar onSearch={handleSearch} />;
}
