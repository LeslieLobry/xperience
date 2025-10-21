'use client';

import { useRef, useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import RechercheSidebar from "../RechercheSidebar/RechercheSidebar";
import RechercheResultats from "../RechercheResultats/RechercheResultats";
import "./RechercheClient.css"

export default function RechercheClient() {
  const sidebarRef = useRef();
  const [isMobile, setIsMobile] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Détection mobile
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sait si une recherche est active (des paramètres dans l’URL)
  const hasActiveSearch = useMemo(() => searchParams.toString().length > 0, [searchParams]);

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

  const handleSearch = (filtres) => {
    const params = new URLSearchParams();
    Object.entries(filtres).forEach(([k, v]) => {
      if ((k === "rayon" || k === "ageMin" || k === "ageMax") && (v === "" || v == null)) return;
      if (Array.isArray(v)) v.forEach(x => params.append(k, x));
      else if (typeof v === "boolean") { if (v) params.set(k, "true"); }
      else if (v !== "" && v !== undefined && v !== null) { params.set(k, v); }
    });
    router.push(`/recherche?${params.toString()}`);
  };

  // Actions barre d’outils
  const handleResetSearch = () => router.push("/recherche"); // réinitialise (aucun param)
  const handleGoHome = () => router.push("/accueil");        // adapte si ta home est "/"

  return (
    <div className="page-recherche">
      {/* Barre d’actions visible seulement après une recherche */}
      {hasActiveSearch && (
        <div className="recherche-toolbar" role="region" aria-label="Actions de recherche">
          <button className="btn-outlined" onClick={handleResetSearch}>
            Nouvelle recherche
          </button>
          <button className="btn-primary" onClick={handleGoHome}>
            Accueil
          </button>
        </div>
      )}

      <RechercheSidebar
        className="RechercheSidebar"
        ref={sidebarRef}
        onSearch={handleSearch}
        isMobile={isMobile}
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
