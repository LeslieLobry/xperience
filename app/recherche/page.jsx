import { Suspense } from 'react';

import "./recherche.css";
import RechercheClient from "../../components/RechercheClient/RechercheClient";

export default function Page() {
   return (
    <Suspense fallback={<div>Chargement...</div>}>
      <RechercheClient />
    </Suspense>
  );
}
