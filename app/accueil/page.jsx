import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { redirect } from "next/navigation";
import "./accueil.css";
import RechercheWrapper from "../../components/RechercheWrapper/RechercheWrapper";
import Link from "next/link";

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

  const profilsEnLigne = await prisma.utilisateur.findMany({
    where: {
      statut: "en_ligne",
      NOT: { id: decoded.id },
    },
    select: {
      id: true,
      pseudo: true,
      photoUrl: true,
      age: true,
      localisation: true,
    },
  });

  const tousLesProfils = await prisma.utilisateur.findMany({
    where: {
      NOT: { id: decoded.id },
    },
    select: {
      id: true,
      pseudo: true,
      photoUrl: true,
      age: true,
      localisation: true,
    },
  });

  return (
    <div className="accueil-page">
      <h1>Profils en ligne</h1>
      <div className="profil-list">
        {profilsEnLigne.map((user) => (
          <Link href={`/profil/${user.id}`} key={user.id} className="profil-card-link">
            <div className="profil-card">
              <img src={user.photoUrl || "/default.jpg"} alt={user.pseudo} className="profil-photo" />
              <h2>{user.pseudo}</h2>
              <p>{user.age} ans - {user.localisation}</p>
            </div>
          </Link>
        ))}
      </div>

      <h1>Tous les profils</h1>
      <div className="profil-list">
        {tousLesProfils.map((user) => (
          <Link href={`/profil/${user.id}`} key={user.id} className="profil-card-link">
            <div className="profil-card">
              <img src={user.photoUrl || "/default.jpg"} alt={user.pseudo} className="profil-photo" />
              <h2>{user.pseudo}</h2>
              <p>{user.age} ans - {user.localisation}</p>
            </div>
          </Link>
        ))}
      </div>

      <RechercheWrapper />
    </div>
  );
}
