// lib/getUserFromToken.js
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

export async function getUserFromToken() {
  const token = cookies().get("token")?.value;

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.id) return null;

    const user = await prisma.utilisateur.findUnique({
      where: { id: Number(decoded.id) }, // si UUID, ne pas convertir
    });

    return user;
  } catch (error) {
    console.error("❌ Token invalide ou erreur Prisma :", error);
    return null;
  }
}
