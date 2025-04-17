import { prisma } from "../../lib/prisma";

export default async function UtilisateursPage() {
  const users = await prisma.utilisateur.findMany({
    include: {
      recherches: true,
    },
  });

  return (
    <div>
      <h1>Liste des utilisateurs</h1>
      {users.map((user) => (
        <div key={user.id}>
          <h2>{user.pseudo}</h2>
          <p>Nom : {user.prenom} {user.nom}</p>
          <p>Âge : {user.age} ans</p>
          <p>Localisation : {user.localisation}</p>
          <p>Type : {user.type}</p>
          <p>Orientation : {user.orientation}</p>
          <p>Recherches : {user.recherches.map(r => r.label).join(", ") || "Aucune"}</p>
          {user.photoUrl && <img src={user.photoUrl} alt={`Photo de ${user.pseudo}`} width="100" />}
          <hr />
        </div>
      ))}
    </div>
  );
}
