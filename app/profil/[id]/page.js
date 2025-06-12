import { redirect } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import Profil from "../../../components/Profil/Profil";
import ProfilProtege from "../../../components/ProfilProtege/ProfilProtege";
import { safeParam, getUserFromToken } from "../../../lib/serverUtils";

const prisma = new PrismaClient();

export default async function ProfilPage({ params }) {
  const id = params.id;
  if (!id) return redirect("/utilisateurs");

  const decoded = await getUserFromToken(); // ✅ doit être async si tu utilises cookies()
  if (!decoded) return redirect("/connexion");

  const connectedUser = await prisma.Utilisateur.findUnique({
    where: { id: decoded.id },
  });

  const user = await prisma.Utilisateur.findUnique({
    where: { id: parseInt(id) },
    include: {
      recherches: true,
      envies: true,
      photos: {
        where: {
          galeriePriveeId: null, // ✅ uniquement les photos publiques
        },
      },
      galeriePrivee: { // ✅ nom correct
        include: { photos: true },
      },
      avisRecus: {
        include: {
          auteur: true,
        },
      },
    },
  });

  if (!user) return redirect("/utilisateurs");

  return (
    <ProfilProtege userId={decoded.id}>
      <Profil user={user} connectedUser={connectedUser} />
    </ProfilProtege>
  );
}
