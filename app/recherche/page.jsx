import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserFromToken } from "../../lib/auth";

import "./recherche.css";
import RechercheClient from "../../components/RechercheClient/RechercheClient";

export default async function Page() {
  const cookieStore = cookies();
  const user = await getUserFromToken(cookieStore);

  if (!user) return redirect("/connexion");

  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <RechercheClient utilisateur={user} />
    </Suspense>
  );
}
