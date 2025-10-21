// app/recherche/page.jsx
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserFromToken } from "../../lib/auth";
import RechercheClient from "../../components/RechercheClient/RechercheClient";
import "./recherche.css"; // ← ce fichier ne doit plus contenir AUCUNE règle globale

export default async function Page() {
  const cookieStore = cookies();
  const user = await getUserFromToken(cookieStore);

  if (!user) return redirect("/connexion");

  return (
    <div className="PageRecherche">
      <Suspense fallback={<div>Chargement...</div>}>
        <RechercheClient utilisateur={user} />
      </Suspense>
    </div>
  );
}
