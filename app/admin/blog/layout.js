import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { redirect } from "next/navigation";

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET non défini");

export default async function AdminBlogLayout({ children }) {
  const cookieStore = await cookies();
  const token = (await cookieStore).get("token")?.value;

  if (!token) return redirect("/connexion");

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return redirect("/connexion");
  }

  if (decoded.role !== "ADMIN") {
    return redirect("/acces-refuse");
  }

  return <>{children}</>;
}
