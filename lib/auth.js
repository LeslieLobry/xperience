import jwt from "jsonwebtoken";

export function getUserFromToken(cookies) {
  const token = cookies.get("token")?.value;

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error("❌ Token invalide :", error);
    return null;
  }
}
