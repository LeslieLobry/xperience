import { useEffect, useState } from "react";

export default function VisitesRecues() {
  const [visites, setVisites] = useState([]);

  useEffect(() => {
    fetch("/api/visites/recues")
      .then((res) => res.json())
      .then(setVisites);
  }, []);

  return (
    <div>
      <h2>Ils ont visité votre profil</h2>
      {visites.length === 0 ? (
        <p>Aucune visite pour le moment</p>
      ) : (
        <ul>
          {visites.map(({ id, visiteur, date }) => (
            <li key={id}>
              <img src={visiteur.photo} alt={visiteur.pseudo} width={40} />
              <span>{visiteur.pseudo}</span> — {new Date(date).toLocaleString()}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
