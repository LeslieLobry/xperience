import jwt from "jsonwebtoken";
import { cookies as nextCookies, headers } from "next/headers";
import { prisma } from "./prisma";

export async function getUserFromToken(cookieStoreParam) {
  // ---- Lecture cookie (site web)
  const cookieStore = cookieStoreParam ?? (await nextCookies());
  let token = cookieStore.get("token")?.value;

  // ---- Lecture header Authorization (mobile)
  if (!token) {
    const hdrs = headers();
    const auth = hdrs.get("authorization") || "";
    if (auth.startsWith("Bearer ")) {
      token = auth.slice(7);
    }
  }

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.id || isNaN(Number(decoded.id))) {
      console.warn("❌ Token décodé mais ID invalide :", decoded);
      return null;
    }

    const user = await prisma.utilisateur.findUnique({
      where: { id: Number(decoded.id) },
      include: {
        recherches: true,
        envies: true,
      },
    });

    if (!user) {
      console.warn("❌ Aucun utilisateur trouvé avec cet ID :", decoded.id);
      return null;
    }

    return user;
  } catch (error) {
    console.error("❌ Erreur getUserFromToken :", error);
    return null;
  }
}
