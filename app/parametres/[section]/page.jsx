import { getUserFromToken } from "../../../lib/auth"; 
import ReglagesSection from "../../../components/Parametres/ReglagesSection/ReglagesSection";
import SecuriteSection from "../../../components/Parametres/SecuritySection/SecuritySection";
// import ConfidentialiteSection from "@/components/Parametres/ConfidentialiteSection";
import BlocagesSection from "../../../components/Parametres/BlocagesSection/BlocagesSection";
import GalerieSection from "../../../components/Parametres/GalerieSection/GalerieSection";
// import AbonnementSection from "@/components/Parametres/AbonnementSection";
// import ParrainageSection from "@/components/Parametres/ParrainageSection";
// import CommandesSection from "@/components/Parametres/CommandesSection";

export default async function SectionPage({ params }) {
  const { section } = await params;
  const connectedUser = await getUserFromToken();
  const sectionComponents = {
    reglages: <ReglagesSection />,
    securite: <SecuriteSection />,
    // confidentialite: <ConfidentialiteSection />,
    blocages: <BlocagesSection />,
    galerie: <GalerieSection utilisateurId={connectedUser.id} />
    // abonnement: <AbonnementSection />,
    // parrainage: <ParrainageSection />,
    // commandes: <CommandesSection />,
  };

  return sectionComponents[section] || (
    <>
      <h2 className="parametres-title">SECTION INCONNUE</h2>
      <p>La page que vous cherchez n'existe pas.</p>
    </>
  );
}
