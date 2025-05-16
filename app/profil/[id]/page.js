import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import Profil from "../../../components/Profil/Profil";
import ProfilProtege from "../../../components/ProfilProtege/ProfilProtege";

const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET;

export default async function ProfilPage({ params }) {
  const token = cookies().get("token")?.value;

  if (!token) return redirect("/connexion");

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return redirect("/connexion");
  }

  const connectedUser = await prisma.utilisateur.findUnique({
    where: { id: decoded.id },
  });

  const user = await prisma.utilisateur.findUnique({
    where: { id: parseInt(params.id) },
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
