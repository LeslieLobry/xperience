export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getUserFromToken } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { getIdsUtilisateursExclus } from "../../lib/utilsFiltrage";
import ProfilsDisplayServer from "../../components/ProfilsDisplayServer/ProfilsDisplayServer";
import DerniersArticles from "../../components/DerniersArticles/DerniersArticles";
import DerniersEvenements from "../../components/DerniersEvenements/DerniersEvenements";
import RappelVerification from "../../components/RappelVerification/RappelVerification";
import LoaderAnnonce from "../../components/LoaderAnnonce/LoaderAnnonce";
import RechercheWrapper from "../../components/RechercheWrapper/RechercheWrapper";
import { Suspense } from "react";

import AccueilScope from "./_AccueilScope";
import s from "./accueil.module.css"; // ⬅️ module CSS

export default async function AccueilPage() {
  const user = await getUserFromToken();
  if (!user?.id || isNaN(Number(user.id))) return redirect("/connexion");

  const exclusPromise = getIdsUtilisateursExclus(user.id);

  const [articles, evenementsRaw] = await Promise.all([
    prisma.article.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true, titre: true, slug: true, createdAt: true,
        images: { take: 1, select: { url: true } },
      },
    }),
    prisma.evenement.findMany({
      select: { id: true, titre: true, imageUrl: true, dates: true, lieu: true },
    }),
  ]);

  const now = new Date();
  const evenements = evenementsRaw
    .filter(evt => Array.isArray(evt.dates) && evt.dates.some(d => new Date(d) >= now))
    .sort((a, b) => {
      const nextDateA = (a.dates || []).find(d => new Date(d) >= now) || a.dates[0];
      const nextDateB = (b.dates || []).find(d => new Date(d) >= now) || b.dates[0];
      return new Date(nextDateA) - new Date(nextDateB);
    })
    .slice(0, 3);

  return (
    <AccueilScope>
      <div className={s.page}>
        {user.verificationIdentiteStatut !== true && <RappelVerification />}
        <LoaderAnnonce />
        <div className={s.gridAccueil}>
          <RechercheWrapper />
          <div className={s.profilList1}>
            <Suspense fallback={<p>Chargement des profils...</p>}>
              <ProfilsDisplayServer userId={user.id} exclusPromise={exclusPromise} />
            </Suspense>
          </div>
          <div className={s.gridArticles}>
            <DerniersArticles articles={articles} />
          </div>
          <div className={s.gridEvent}>
            <DerniersEvenements evenements={evenements} />
          </div>
        </div>
      </div>
    </AccueilScope>
  );
}
