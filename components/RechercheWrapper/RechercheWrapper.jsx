"use client";
import { useRouter } from "next/navigation";
import RechercheSidebar from "../RechercheSidebar/RechercheSidebar";

export default function RechercheWrapper() {
  const router = useRouter();

  const handleSearch = (form) => {
    console.log("[handleSearch] Reçu :", form, typeof form.autourDeMoi, form.latitude, form.longitude);
  console.log("[handleSearch] Reçu :", form);
    // PATCH : force autourDeMoi en booléen si c'est une string (cas vocal)
    if (typeof form.autourDeMoi === "string") {
      form.autourDeMoi = form.autourDeMoi === "true";
    }
    console.log("handleSearch appelé avec :", form, "typeof autourDeMoi:", typeof form.autourDeMoi);

    if (form.autourDeMoi) {
      if (!navigator.geolocation) {
        alert("La géolocalisation n'est pas supportée !");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          console.log("Position GPS récupérée :", pos.coords.latitude, pos.coords.longitude);
          const latitude = pos.coords.latitude;
          const longitude = pos.coords.longitude;
          const query = new URLSearchParams();
          Object.entries(form).forEach(([key, value]) => {
            if (Array.isArray(value)) value.forEach((v) => query.append(key, v));
            else if (value !== undefined && value !== null && value !== "") query.append(key, value);
          });
          query.set("latitude", latitude);
          query.set("longitude", longitude);
          query.set("rayon", rayon); 
          router.push("/recherche?" + query.toString());
        },
        () => {
          alert("Impossible de récupérer ta position géographique !");
        }
      );
      return;
    }

    // Sinon (recherche classique)
    const query = new URLSearchParams();
    Object.entries(form).forEach(([key, value]) => {
      if (Array.isArray(value)) value.forEach((v) => query.append(key, v));
      else if (value !== undefined && value !== null && value !== "") query.append(key, value);
    });
    router.push("/recherche?" + query.toString());
  };

  return <RechercheSidebar onSearch={handleSearch} />;
}
