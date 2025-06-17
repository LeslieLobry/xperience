import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import Link from "next/link";
import { prisma } from "../../lib/prisma";
import { getIdsUtilisateursExclus } from "../../lib/utilsFiltrage";

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

  const exclus = await getIdsUtilisateursExclus(decoded.id);

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
      <div className="profils-complet">
        {utilisateurs.map((user) => (
          <Link href={`/profil/${user.id}`} key={user.id} className="profil-card-link">
            <div className="profil-card">
              <img
                src={user.photoUrl?.startsWith("http") ? user.photoUrl : "/default.jpg"}
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
