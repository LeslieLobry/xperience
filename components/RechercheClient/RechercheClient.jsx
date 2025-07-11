'use client';

import { useRef, useState } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { extraireFiltresVocal } from "../../lib/extraireFiltresVocal"; // adapte le chemin si besoin
import ReconnaissanceVocale from "../ReconnaissanceVocale/ReconnaissanceVocale";
import RechercheSidebar from "../RechercheSidebar/RechercheSidebar";
import RechercheResultats from "../RechercheResultats/RechercheResultats";

export default function RechercheClient() {
  const sidebarRef = useRef();
   const [resumeVocal, setResumeVocal] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();

  // Récupération de tous les filtres utilisés dans la sidebar :
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



  // Fonction pour lancer la recherche (change l'URL des filtres)
const handleSearch = (filtres) => {
  console.log("[RechercheClient] handleSearch appelé avec filtres:", filtres);
  const params = new URLSearchParams();
  Object.entries(filtres).forEach(([k, v]) => {
    if ((k === "rayon" || k === "ageMin" || k === "ageMax") && (v === "" || v == null)) return;
    if (Array.isArray(v)) v.forEach(x => params.append(k, x));
    else if (typeof v === "boolean") {
      if (v) params.set(k, "true");
    }
    else if (v !== "" && v !== undefined && v !== null) params.set(k, v);
  });
  router.push(`/recherche?${params.toString()}`);
};

  return (
    <div className="page-recherche">
      <RechercheSidebar ref={sidebarRef} onSearch={handleSearch} />
      <RechercheResultats
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
