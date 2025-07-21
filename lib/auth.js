// getUserFromToken.js
import jwt from "jsonwebtoken";
import { prisma } from "./prisma";
import { cookies as nextCookies } from "next/headers";

export async function getUserFromToken(cookieStoreParam) {
  const cookieStore = cookieStoreParam ?? (await nextCookies());
  const token = cookieStore.get("token")?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const t0 = Date.now();
    // On récupère en base
    const user = await prisma.utilisateur.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        pseudo: true,
        role: true,
        photoUrl: true,
        type: true,
        verificationIdentite: true,
        verificationDeadline: true,
      },
    });
       const t1 = Date.now();
    console.log("⏱ getUserFromToken - Prisma duration:", t1 - t0, "ms");
    return user;
  } catch (error) {
    console.error("❌ Erreur getUserFromToken :", error);
    return null;
  }
}
