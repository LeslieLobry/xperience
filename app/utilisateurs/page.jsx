import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import ProfilDetailsSummary from "../../components/ProfilDetailsSummary/ProfilDetailsSummary";
import PreferencesSummary from "../../components/PreferencesSummary/PreferencesSummary";

const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET;

export default async function ProfilPage() {
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return redirect("/connexion");

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch (e) {
    return redirect("/connexion");
  }

  const user = await prisma.utilisateur.findUnique({
    where: { id: decoded.id },
    include: { recherches: true },
  });

  if (!user) return redirect("/connexion");

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Bienvenue, {user.pseudo}</h1>
      <p>Email : {user.email}</p>
      <p>Âge : {user.age} ans</p>
      <p>Localisation : {user.localisation}</p>
      <p>Orientation : {user.orientation}</p>
      <p>Type : {user.type}</p>
      <p>Recherches : {user.recherches.map(r => r.label).join(", ") || "Aucune"}</p>
      {user.photoUrl && (
        <img
          src={user.photoUrl}
          alt={`Photo de ${user.pseudo}`}
          width={120}
          style={{ borderRadius: "10px", marginTop: "1rem" }}
        />
      )}
      <PreferencesSummary/>
      <ProfilDetailsSummary/>
    </div>
  );
}
