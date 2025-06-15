// app/profils/page.jsx
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { redirect } from "next/navigation";
import Link from "next/link";
import "../accueil/accueil.css";
import { getIdsUtilisateursExclus } from "../../lib/utilsFiltrage";

const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET;

export default async function PageTousLesProfils() {
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return redirect("/connexion");

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return redirect("/connexion");
  }

  let exclus = [];
  try {
    exclus = await getIdsUtilisateursExclus(decoded.id);
  } catch (err) {
    console.error("Erreur exclusions :", err);
  }

  const utilisateurs = await prisma.utilisateur.findMany({
    where: {
      NOT: {
        id: { in: [...exclus, decoded.id] },
      },
    },
    select: {
      id: true,
      pseudo: true,
      photoUrl: true,
      age: true,
      localisation: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="accueil-page">
      <h1 className="profil-list1-title">Tous les profils</h1>
      <div className="profil-list2">
        {utilisateurs.map((user) => (
          <Link href={`/profil/${user.id}`} key={user.id} className="profil-card-link">
            <div className="profil-card">
              <img
                src={
                  user.photoUrl
                    ? user.photoUrl.startsWith("http")
                      ? user.photoUrl
                      : `/uploads/${user.photoUrl.replace(/^\/?uploads\//, "")}`
                    : "/default.jpg"
                }
                alt={user.pseudo}
                className="profil-photo"
              />
              <h2>{user.pseudo}</h2>
              <p>{user.age} ans - {user.localisation}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
