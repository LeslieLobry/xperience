import { useEffect, useState } from "react";

export default function VisitesFaites() {
  const [visites, setVisites] = useState([]);

  useEffect(() => {
    fetch("/api/visites/faites")
      .then((res) => res.json())
      .then(setVisites);
  }, []);

  return (
    <div>
      <h2>Profils que vous avez visités</h2>
      {visites.length === 0 ? (
        <p>Vous n'avez visité aucun profil pour le moment.</p>
      ) : (
        <ul>
          {visites.map(({ id, visite, date }) => (
            <li key={id}>
              <img src={visite.photo} alt={visite.pseudo} width={40} />
              <span>{visite.pseudo}</span> — {new Date(date).toLocaleString()}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
