export const dynamic = "force-dynamic"; // 🔁 désactive le cache SSR sur Vercel

import { redirect } from "next/navigation";
import { prisma } from "../../../lib/prisma"; // ✅ utilise l'instance réutilisable
import Profil from "../../../components/Profil/Profil";
import ProfilProtege from "../../../components/ProfilProtege/ProfilProtege";
import { getUserFromToken } from "../../../lib/auth" // ✅ déjà bon

export default async function ProfilPage({ params }) {
  const id = parseInt(params.id);
  if (isNaN(id)) return redirect("/utilisateurs");

  const connectedUser = await getUserFromToken();
  if (!connectedUser) return redirect("/connexion");

  // Redirection si identité non vérifiée + délai dépassé
  if (
    !connectedUser.verificationIdentite &&
    connectedUser.verificationDeadline &&
    new Date() > new Date(connectedUser.verificationDeadline)
  ) {
    return redirect("/verif-identite-obligatoire");
  }

  try {
    const user = await prisma.utilisateur.findUnique({
      where: { id },
      include: {
        recherches: true,
        envies: true,
        photos: { where: { galeriePriveeId: null } },
        galeriePrivee: { include: { photos: true } },
        avisRecus: { include: { auteur: true } },
      },
    });

    if (!user) return redirect("/utilisateurs");

    return (
      <ProfilProtege userId={connectedUser.id}>
        <Profil user={user} connectedUser={connectedUser} />
      </ProfilProtege>
    );
  } catch (error) {
    console.error("❌ Erreur /profil/[id] :", error);
    return redirect("/erreur-serveur");
  }
}
