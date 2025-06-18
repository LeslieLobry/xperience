import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";
import { getIdsUtilisateursExclus } from "../../lib/utilsFiltrage";
import ProfilsDisplay from "../../components/ProfilsDisplay/ProfilsDiplay";

const secret = process.env.JWT_SECRET;

export default async function PageTousLesProfils() {
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return redirect("/connexion");

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return redirect("/connexion");
  }

  const exclus = await getIdsUtilisateursExclus(decoded.id);

  const utilisateurs = await prisma.utilisateur.findMany({
    where: {
      NOT: {
        id: { in: [...exclus, decoded.id] },
      },
    },
    select: {
      id: true,
      pseudo: true,
      photoUrl: true,
      age: true,
      localisation: true,
      statut: true, // ✅ pour la pastille
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="accueil-page">
      <ProfilsDisplay profils={utilisateurs} />
    </div>
  );
}
