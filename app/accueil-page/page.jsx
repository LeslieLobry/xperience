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

import nextDynamic from "next/dynamic"; // ✅ renommé
import { Suspense } from "react";
import "./accueil.css";

/* --------------------------------------------------------------------------
   🔍 Recherche : gros composant client → dynamic + client-only
   -------------------------------------------------------------------------- */
const RechercheWrapper = nextDynamic(
  () => import("../../components/RechercheWrapper/RechercheWrapper"),
  { ssr: false }
);

/* --------------------------------------------------------------------------
   👥 Section profils : server component autonome + Suspense
   -------------------------------------------------------------------------- */
async function ProfilsSection({ userId }) {
  const exclusPromise = getIdsUtilisateursExclus(userId);

  return (
    <ProfilsDisplayServer userId={userId} exclusPromise={exclusPromise} />
  );
}

/* --------------------------------------------------------------------------
   📰 Section articles : Prisma isolé dans un composant async
   -------------------------------------------------------------------------- */
async function ArticlesSection() {
  const articles = await prisma.article.findMany({
    orderBy: { createdAt: "desc" },
    take: 4,
    select: {
      id: true,
      titre: true,
      slug: true,
      createdAt: true,
      images: { take: 1, select: { url: true } },
    },
  });

  return <DerniersArticles articles={articles} />;
}

/* --------------------------------------------------------------------------
   📅 Section événements : idem, mais filtré côté serveur
   -------------------------------------------------------------------------- */
async function EvenementsSection() {
  const evenementsRaw = await prisma.evenement.findMany({
    select: { id: true, titre: true, imageUrl: true, dates: true, lieu: true },
  });

  const now = new Date();
  const evenements = evenementsRaw
    .filter(
      (evt) =>
        Array.isArray(evt.dates) && evt.dates.some((d) => new Date(d) >= now)
    )
    .sort((a, b) => {
      const nextDateA =
        (a.dates || []).find((d) => new Date(d) >= now) || a.dates[0];
      const nextDateB =
        (b.dates || []).find((d) => new Date(d) >= now) || b.dates[0];
      return new Date(nextDateA) - new Date(nextDateB);
    })
    .slice(0, 3);

  return <DerniersEvenements evenements={evenements} />;
}

/* --------------------------------------------------------------------------
   🚀 Page d’accueil : hyper légère
   -------------------------------------------------------------------------- */
export default async function AccueilPage() {
  const user = await getUserFromToken();
  if (!user?.id || isNaN(Number(user.id))) {
    return redirect("/connexion");
  }

  return (
    <div className="accueil-page">
      {user.verificationIdentiteStatut !== true && <RappelVerification />}

      <LoaderAnnonce />

      <div className="grid-accueil">
        {/* 🔍 Recherche : client-only, avec Suspense pour le loader */}
        <div className="accueil-recherche">
          <Suspense
            fallback={
              <div className="recherche-loading">
                Chargement de la recherche...
              </div>
            }
          >
            <RechercheWrapper />
          </Suspense>
        </div>

        {/* 👥 Profils : stream + fallback */}
        <div className="profil-list1">
          <Suspense fallback={<p>Chargement des profils...</p>}>
            <ProfilsSection userId={user.id} />
          </Suspense>
        </div>

        {/* 📰 Articles récents */}
        <div className="grid-articles">
          <Suspense fallback={<p>Chargement des articles...</p>}>
            <ArticlesSection />
          </Suspense>
        </div>

        {/* 🎟️ Événements à venir */}
        <div className="grid-event">
          <Suspense fallback={<p>Chargement des événements...</p>}>
            <EvenementsSection />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
