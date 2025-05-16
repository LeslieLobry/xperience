import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { redirect, notFound } from "next/navigation";
import Profil from "../../../components/Profil/Profil";

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

  const userId = parseInt(params.id);
  const viewedUser = await prisma.utilisateur.findUnique({
    where: { id: userId },
    include: {
      recherches: true,
      photos: true,
      avisRecus: {
        include: {
          auteur: {
            select: {
              id: true,
              pseudo: true,
              photoUrl: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!viewedUser) return notFound();

  return <Profil user={viewedUser} connectedUser={connectedUser} />;
}
