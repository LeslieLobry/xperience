import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function getUserFromToken() {
  const cookieStore = await cookies(); // ✅ ici tu awaits correctement
  const token = cookieStore.get("token")?.value;

  if (!token) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error("❌ Token invalide :", error);
    return null;
  }
}
