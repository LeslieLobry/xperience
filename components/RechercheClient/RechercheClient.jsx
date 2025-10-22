'use client';

import { useRef, useState, useEffect, useTransition } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import RechercheSidebar from "../RechercheSidebar/RechercheSidebar";
import RechercheResultats from "../RechercheResultats/RechercheResultats";
import "./RechercheClient.css"

export default function RechercheClient() {
  const sidebarRef = useRef();
  const [resumeVocal, setResumeVocal] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ✅ anti-rafale pour l’URL
  const debounceRef = useRef(null);

  // (Optionnel) détecte un remount du composant
  const mountRef = useRef(0);
  useEffect(() => {
    mountRef.current += 1;
    console.log("[PageRecherche][mount count]", mountRef.current);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ------ lecture des query params ------
  const pseudo         = searchParams.get("pseudo") || "";
  const type           = searchParams.getAll("type");
  const orientation    = searchParams.getAll("orientation");
  const rechercheType  = searchParams.getAll("rechercheType");
  const ageMin         = searchParams.get("ageMin") || "";
  const ageMax         = searchParams.get("ageMax") || "";
  const localisation   = searchParams.get("localisation") || "";
  const photo          = searchParams.get("photo") === "true";
  const description    = searchParams.get("description") === "true";
  const statut         = searchParams.get("statut") || "all";
  const experience     = searchParams.getAll("experience");
  const fumeur         = searchParams.getAll("fumeur");
  const silhouette     = searchParams.getAll("silhouette");
  const taille         = searchParams.getAll("taille");
  const origines       = searchParams.getAll("origines");
  const yeux           = searchParams.getAll("yeux");
  const cheveux        = searchParams.getAll("cheveux");
  const recherches     = searchParams.getAll("recherches");
  const envies         = searchParams.getAll("envies");
  const rayon          = searchParams.get("rayon") || "";

  // ✅ NEW: debounce + replace + scroll:false
  const handleSearch = (filtres) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      Object.entries(filtres).forEach(([k, v]) => {
        // on ne met pas de champs vides
        if ((k === "rayon" || k === "ageMin" || k === "ageMax") && (v === "" || v == null)) return;

        // ⚠️ règle: si localisation existe => PAS de lat/lng dans l’URL
        if (k === "latitude" || k === "longitude") return;

        if (Array.isArray(v)) {
          v.forEach(x => (x != null && x !== "") && params.append(k, x));
        } else if (typeof v === "boolean") {
          if (v) params.set(k, "true");
        } else if (v !== "" && v !== undefined && v !== null) {
          params.set(k, String(v));
        }
      });

      // 👇 replace (pas push) pour éviter une “vraie” nav + pile historique gonflée
      startTransition(() => {
        router.replace(`/recherche?${params.toString()}`, { scroll: false });
      });
    }, 400); // 300–500ms marche bien
  };

  // cleanup du debounce
  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  return (
    <div className="page-recherche">
      <RechercheSidebar
        className="RechercheSidebar"
        ref={sidebarRef}
        onSearch={handleSearch}
      />
      <RechercheResultats
        className="RechercheResultats"
        pseudo={pseudo}
        type={type}
        orientation={orientation}
        rechercheType={rechercheType}
        ageMin={ageMin}
        ageMax={ageMax}
        localisation={localisation}
        photo={photo}
        description={description}
        statut={statut}
        experience={experience}
        fumeur={fumeur}
        silhouette={silhouette}
        taille={taille}
        origines={origines}
        yeux={yeux}
        cheveux={cheveux}
        recherches={recherches}
        envies={envies}
        rayon={rayon}
      />
    </div>
  );
}
