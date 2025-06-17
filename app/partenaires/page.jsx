
import Link from "next/link";
import "./partenaires.css";

const partenaires = [
  {
    nom: "Karine Schein",
    type: "Thérapeute de couple / Sexologue",
    lien: "https://www.conseil-conjugal-familial-lyon.com/",
  },
  {
    nom: "Krapulle",
    type: "Sextoy français",
    lien: "http://krapulle.com",
  },
  {
    nom: "Puissante",
    type: "Sextoy français",
    lien: "http://puissante.co",
  },
  // {
  //   nom: "La tentation",
  //   type: "Club libertin",
  //   lien: "http://la-tentation.fr",
  // },
  // {
  //   nom: "Mi-noi",
  //   type: "Club libertin",
  //   lien: "http://mi-noi.be",
  // },
  // {
  //   nom: "Acanthus Wellness",
  //   type: "Club libertin",
  //   lien: "https://www.acanthuswellness.be/fr/",
  // },
  // {
  //   nom: "Acanthus Club",
  //   type: "Club libertin",
  //   lien: "https://www.acanthus.be/",
  // },
];

export default function PagePartenaires() {
  return (
    <div className="page-partenaires">
      <h1 className="titre-page">Nos partenaires</h1>
      <div className="grid-partenaire">
      <div className="cartes-partenaires">
        {partenaires.map((p) => (
          <div className="carte-partenaire" key={p.nom}>
            <h2>{p.nom}</h2>
            <p className="partenaire-type">{p.type}</p>
            <Link href={p.lien} target="_blank" rel="noopener noreferrer" className="partenaire-lien">
              Visiter le site
            </Link>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
