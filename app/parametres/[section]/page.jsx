import { redirect } from "next/navigation";
import { getUserFromToken } from "../../../lib/auth";
import ReglagesSection from "../../../components/Parametres/ReglagesSection/ReglagesSection";
import SecuriteSection from "../../../components/Parametres/SecuritySection/SecuritySection";
import BlocagesSection from "../../../components/Parametres/BlocagesSection/BlocagesSection";
import GalerieSection from "../../../components/Parametres/GalerieSection/GalerieSection";
import VisitesSection from "../../../components/Parametres/VisitesSection/VisitesSection";
import LikesSection from "../../../components/LikesSection/LikesSection";

export default async function SectionPage({ params }) {
  const connectedUser = await getUserFromToken();

  if (!connectedUser) {
    redirect("/connexion");
  }

  const { section } = params;

  const sectionComponents = {
    reglages: <ReglagesSection />,
    securite: <SecuriteSection />,
    blocages: <BlocagesSection />,
    galerie: <GalerieSection utilisateurId={connectedUser.id} />,
    visites: <VisitesSection />,
    likes : <LikesSection />
  };

  return sectionComponents[section] || (
    <>
      <h2 className="parametres-title">SECTION INCONNUE</h2>
      <p>La page que vous cherchez n'existe pas.</p>
    </>
  );
}
