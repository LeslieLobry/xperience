'use client';

import { useSearchParams } from 'next/navigation';
import RechercheWrapper from '../RechercheWrapper/RechercheWrapper';
import RechercheResultats from '../RechercheResultats/RechercheResultats';

export default function RechercheClient() {
  const searchParams = useSearchParams();

  // Exemples de récupération de filtres
  const pseudo = searchParams.get("pseudo") || "";
  const type = searchParams.getAll("type");
  const orientation = searchParams.getAll("orientation");

  return (
    <div className="page-recherche">
      <RechercheWrapper />
      <RechercheResultats
        pseudo={pseudo}
        type={type}
        orientation={orientation}
        // ajoutez d'autres props si nécessaire
      />
    </div>
  );
}
