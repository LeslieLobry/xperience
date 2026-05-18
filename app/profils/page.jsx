import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";
import { getIdsUtilisateursExclus } from "../../lib/utilsFiltrage";
import ProfilsDisplay from "../../components/ProfilsDisplay/ProfilsDisplay";
import RechercheWrapper from "../../components/RechercheWrapper/RechercheWrapper";
import styles from "./profils.module.css";

const secret = process.env.JWT_SECRET;

export const dynamic = "force-dynamic"; // ✅ évite tout cache RSC sur cette page (utile en debug)

export default async function PageTousLesProfils() {
  if (!secret) return redirect("/connexion");

  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return redirect("/connexion");

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return redirect("/connexion");
  }

  const userId = Number(decoded.id);
  if (!userId || Number.isNaN(userId)) return redirect("/connexion");

  const exclus = await getIdsUtilisateursExclus(userId);

  const utilisateurs = await prisma.utilisateur.findMany({
    where: {
      NOT: { id: { in: [...exclus, userId] } },
    },
    select: {
      id: true,
      pseudo: true,
      photoUrl: true,
      age: true,
      localisation: true,

      // ✅ fallback si Presence indispo
      statut: true,
      statutAuto: true,
      lastSeenAt: true,

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
