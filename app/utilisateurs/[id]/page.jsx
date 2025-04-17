// /app/utilisateurs/[id]/page.jsx
import { prisma } from "../../../lib/prisma";

export default async function ProfilUtilisateur({ params }) {
  const user = await prisma.utilisateur.findUnique({
    where: { id: Number(params.id) },
    include: { recherches: true },
  });

  if (!user) {
    return <div>Utilisateur introuvable</div>;
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Profil de {user.pseudo}</h1>
      <p>Nom : {user.prenom} {user.nom}</p>
      <p>Email : {user.email}</p>
      <p>Âge : {user.age} ans</p>
      <p>Localisation : {user.localisation}</p>
      <p>Type : {user.type}</p>
      <p>Orientation : {user.orientation}</p>
      <p>Recherches : {user.recherches.map(r => r.label).join(", ")}</p>
      {user.photoUrl && <img src={user.photoUrl} alt="Photo de profil" width={150} />}
    </div>
  );
}
