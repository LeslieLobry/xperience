import jwt from "jsonwebtoken";
import { cookies as nextCookies } from "next/headers";
import { prisma } from "./prisma";

export async function getUserFromToken(cookieStoreParam) {
  const cookieStore = cookieStoreParam ?? (await nextCookies());
  const token = cookieStore.get("token")?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return {
      id: decoded.id,
      email: decoded.email,
      pseudo: decoded.pseudo,
      role: decoded.role,
      photoUrl: decoded.photoUrl,
      
    };
  } catch (error) {
    console.error("❌ Erreur getUserFromToken :", error);
    return null;
  }
}
