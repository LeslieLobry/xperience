import { prisma } from "../../lib/prisma"; // ✅ Correct
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getIdsUtilisateursExclus } from "../../lib/utilsFiltrage";
import "./profles-en-ligne.css"
const secret = process.env.JWT_SECRET;

export default async function PageProfilsEnLigne() {
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return redirect("/connexion");

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return redirect("/connexion");
  }

  const exclusions = await getIdsUtilisateursExclus(decoded.id).catch((err) => {
    console.error("Erreur exclusions :", err);
    return [];
  });

  const utilisateurs = await prisma.utilisateur.findMany({
    where: {
      NOT: {
        id: { in: [...exclusions, decoded.id] },
      },
      statut: "en_ligne",
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
      <h1 className="profils-list1-title">Profils en ligne</h1>
      <div className="profils-complet">
        {utilisateurs.map((user) => (
          <Link
            href={`/profil/${user.id}`}
            key={user.id}
            className="profil-card-link"
          >
            <div className="profil-card">
              <img
                src={
                  user.photoUrl?.startsWith("http")
                    ? user.photoUrl
                    : "/default.jpg"
                }
                alt={user.pseudo}
                className="profil-photo"
              />
              <h2>{user.pseudo}</h2>
              <p>
                {user.age} ans - {user.localisation}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
