// lib/auth.js (server-only)
import jwt from "jsonwebtoken";
import { cookies as nextCookies, headers as nextHeaders } from "next/headers";
import { prisma } from "./prisma";

const SECRET = process.env.JWT_SECRET;
if (!SECRET) console.warn("⚠️ JWT_SECRET manquant");

export async function getUserFromToken() {
  // 1) Cookie (web)
  const cookieStore = nextCookies(); // ✅ sync, pas de await
  let token = cookieStore.get("token")?.value;

  // 2) Authorization: Bearer ... (mobile)
  if (!token) {
    const hdrs = nextHeaders(); // ✅ sync
    const auth = hdrs.get("authorization") || "";
    if (auth.startsWith("Bearer ")) token = auth.slice(7);
  }

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, SECRET);
    const id = Number(decoded?.id);
    if (!id) {
      console.warn("❌ Token décodé mais ID invalide :", decoded);
      return null;
    }

    const user = await prisma.utilisateur.findUnique({
      where: { id },
      include: {
        recherches: true,
        envies: true,
      },
    });

    if (!user) {
      console.warn("❌ Aucun utilisateur avec cet ID :", id);
      return null;
    }

    return user;
  } catch (err) {
    console.error("❌ getUserFromToken erreur :", err);
    return null;
  }
}
