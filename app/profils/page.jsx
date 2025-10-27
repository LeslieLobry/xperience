import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";
import { getIdsUtilisateursExclus } from "../../lib/utilsFiltrage";
import ProfilsDisplay from "../../components/ProfilsDisplay/ProfilsDisplay";
import RechercheWrapper from "../../components/RechercheWrapper/RechercheWrapper";
import styles from "./profils.module.css"; // <-- CSS local à la page

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
      NOT: { id: { in: [...exclus, decoded.id] } },
    },
    select: {
      id: true,
      pseudo: true,
      photoUrl: true,
      age: true,
      localisation: true,
      statut: true,
      type: true,
      verificationIdentiteStatut: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <RechercheWrapper />
        </aside>
        <main className={styles.main}>
          <ProfilsDisplay profils={utilisateurs} context="recherche" />
        </main>
      </div>
    </div>
  );
}
