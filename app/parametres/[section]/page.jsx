import ReglagesSection from "../../../components/Parametres/ReglagesSection/ReglagesSection";
// import SecuriteSection from "@/components/Parametres/SecuriteSection";
// import ConfidentialiteSection from "@/components/Parametres/ConfidentialiteSection";
// import BlocagesSection from "@/components/Parametres/BlocagesSection";
// import AlertesSection from "@/components/Parametres/AlertesSection";
// import AbonnementSection from "@/components/Parametres/AbonnementSection";
// import ParrainageSection from "@/components/Parametres/ParrainageSection";
// import CommandesSection from "@/components/Parametres/CommandesSection";

export default function SectionPage({ params }) {
  const { section } = params;

  const sectionComponents = {
    reglages: <ReglagesSection />,
    // securite: <SecuriteSection />,
    // confidentialite: <ConfidentialiteSection />,
    // blocages: <BlocagesSection />,
    // alertes: <AlertesSection />,
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
