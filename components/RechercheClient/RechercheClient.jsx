'use client';

import { useRef, useState, useEffect } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import RechercheSidebar from "../RechercheSidebar/RechercheSidebar";
import RechercheResultats from "../RechercheResultats/RechercheResultats";
import "./RechercheClient.css"

export default function RechercheClient() {
  const sidebarRef = useRef();
  const [isMobile, setIsMobile] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Anti-rafale pour l’URL
  const debounceRef = useRef(null);

  // Détection mobile
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

  // Debounce + replace (sans options) et on retire lat/lng de l’URL
  const handleSearch = (filtres) => {
    try {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const params = new URLSearchParams();

        Object.entries(filtres).forEach(([k, v]) => {
          // jamais lat/lng dans l’URL
          if (k === "latitude" || k === "longitude") return;

          // ignore valeurs vides pour numériques
          if ((k === "rayon" || k === "ageMin" || k === "ageMax") && (v === "" || v == null)) return;

          if (Array.isArray(v)) {
            v.forEach((x) => (x != null && x !== "") && params.append(k, String(x)));
          } else if (typeof v === "boolean") {
            if (v) params.set(k, "true");
          } else if (v !== "" && v !== undefined && v !== null) {
            params.set(k, String(v));
          }
        });

        const url = `/recherche?${params.toString()}`;
        router.replace(url);
      }, 400);
    } catch (e) {
      console.error("[handleSearch][error]", e);
    }
  };

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
