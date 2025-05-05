import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import ProfilDetailsSummary from "../../components/ProfilDetailsSummary/ProfilDetailsSummary";
import PreferencesSummary from "../../components/PreferencesSummary/PreferencesSummary";
import DescriptionCard from "../../components/DescriptionCard/DescriptionCard";
import AProposCard from "../../components/AProposCard/AProposCard";
import PhotoUploader from "../../components/PhotoUploader/PhotoUploader";

const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET;

export default async function ProfilPage() {
  const token = cookies().get("token")?.value;

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
      <PhotoUploader currentUrl={user.photoUrl} />
      <PreferencesSummary/>
      <ProfilDetailsSummary/>
      <DescriptionCard/>
      <AProposCard createdAt={user.createdAt} lastLogin={user.lastLogin} />
    </div>
  );
}
