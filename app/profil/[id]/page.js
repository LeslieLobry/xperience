export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import Profil from "../../../components/Profil/Profil";
import ProfilProtege from "../../../components/ProfilProtege/ProfilProtege";
import { getUserFromToken } from "../../../lib/auth";

export default async function ProfilPage({ params }) {
  const id = Number(params?.id);

  if (!id || Number.isNaN(id)) {
    return redirect("/utilisateurs");
  }

  const connectedUser = await getUserFromToken();

  if (!connectedUser) {
    return redirect("/connexion");
  }

  try {
    const user = await prisma.utilisateur.findUnique({
      where: { id },

      select: {
        id: true,
        pseudo: true,
        email: true,

        localisation: true,
        deptCode: true,
        codePostal: true,
        country: true,

        age: true,
        description: true,
        type: true,
        orientation: true,

        latitude: true,
        longitude: true,

        verificationIdentite: true,

        recherches: true,
        envies: true,

        photos: {
          where: {
            galeriePriveeId: null,
          },
          orderBy: {
            createdAt: "desc",
          },
        },

        galeriePrivee: {
          include: {
            photos: {
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },

        avisRecus: {
          orderBy: {
            createdAt: "desc",
          },
          include: {
            auteur: {
              select: {
                id: true,
                pseudo: true,
                photo: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return redirect("/utilisateurs");
    }

    return (
      <ProfilProtege userId={connectedUser.id}>
        <Profil
          user={JSON.parse(JSON.stringify(user))}
          connectedUser={JSON.parse(JSON.stringify(connectedUser))}
        />
      </ProfilProtege>
    );
  } catch (error) {
    console.error("❌ Erreur /profil/[id] :", error);

    return redirect("/erreur-serveur");
  }
}