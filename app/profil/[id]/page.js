export const dynamic = "force-dynamic"; // 🔁 désactive le cache Vercel

import { redirect } from "next/navigation";
import { PrismaClient } from "../../../lib/prisma";
import Profil from "../../../components/Profil/Profil";
import ProfilProtege from "../../../components/ProfilProtege/ProfilProtege";
import {  getUserFromToken } from "../../../lib/auth";

const prisma = new PrismaClient();

export default async function ProfilPage({ params }) {
  const id = params.id;
  if (!id) return redirect("/utilisateurs");

  const decoded = await getUserFromToken();
  if (!decoded) return redirect("/connexion");

  try {
    const connectedUser = await prisma.Utilisateur.findUnique({
      where: { id: decoded.id },
    });

    if (
      !connectedUser.verificationIdentite &&
      connectedUser.verificationDeadline &&
      new Date() > new Date(connectedUser.verificationDeadline)
    ) {
      return redirect("/verif-identite-obligatoire");
    }

    const user = await prisma.Utilisateur.findUnique({
      where: { id: parseInt(id) },
      include: {
        recherches: true,
        envies: true,
        photos: {
          where: {
            galeriePriveeId: null,
          },
        },
        galeriePrivee: {
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
  } catch (error) {
    console.error("❌ Erreur Prisma sur /profil/[id] :", error);
    return redirect("/erreur-serveur"); // tu peux créer une page custom si tu veux
  } finally {
    await prisma.$disconnect(); // ✅ évite les erreurs de connexions mortes
  }
}
