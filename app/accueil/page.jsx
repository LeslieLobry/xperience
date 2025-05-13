import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { redirect } from "next/navigation";
import "./accueil.css"; // crée-le pour le style

const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET;

export default async function AccueilPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return redirect("/connexion");

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return redirect("/connexion");
  }

  const profils = await prisma.utilisateur.findMany({
    where: {
      statut: "en_ligne",
      NOT: { id: decoded.id }, // on ne s'affiche pas soi-même
    },
    select: {
      id: true,
      pseudo: true,
      photoUrl: true,
      age: true,
      localisation: true,
      sexe: true,
    },
  });

  return (
    <div className="accueil-page">
      <h1>Profils en ligne</h1>
      <div className="profil-list">
        {profils.map((user) => (
          <div className="profil-card" key={user.id}>
            <img src={user.photoUrl || "/default.jpg"} alt={user.pseudo} className="profil-photo" />
            <h2>{user.pseudo}</h2>
            <p>{user.age} ans - {user.localisation}</p>
            <p>{user.sexe}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
