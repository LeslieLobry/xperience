import { redirect } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import Profil from "../../../components/Profil/Profil";
import ProfilProtege from "../../../components/ProfilProtege/ProfilProtege";
import { safeParam, getUserFromToken } from "../../../lib/serverUtils";

const prisma = new PrismaClient();

export default async function ProfilPage(context) {
  const id = safeParam(context, "id");
  if (!id) return redirect("/utilisateurs");

  const decoded = getUserFromToken();
  if (!decoded) return redirect("/connexion");

  const connectedUser = await prisma.utilisateur.findUnique({
    where: { id: decoded.id },
  });

  const user = await prisma.utilisateur.findUnique({
    where: {
      id: parseInt(id),
    },
    include: {
      recherches: true,
      envies: true,
      photos: true,
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
