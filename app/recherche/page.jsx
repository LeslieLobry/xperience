import "./recherche.css";
import RechercheWrapper from "../../components/RechercheWrapper/RechercheWrapper";
import RechercheResultats from "../../components/RechercheResultats/RechercheResultats";

export default function Page() {
  return (
    <div className="page-recherche">
      <RechercheWrapper />
      <RechercheResultats />
    </div>
  );
}
