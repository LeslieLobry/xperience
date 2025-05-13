export const dynamic = "force-dynamic";

import { PrismaClient } from "@prisma/client";
import "./recherche.css";

const prisma = new PrismaClient();

export default async function RecherchePage({ searchParams }) {
  // searchParams est de type URLSearchParams dans Next.js 13+
  const getAll = (key) => {
    const val = searchParams.getAll?.(key);
    return val?.length ? val : searchParams.get?.(key) ? [searchParams.get(key)] : [];
  };

  const pseudo = searchParams.get?.("pseudo") || "";
  const type = getAll("type");
  const orientation = getAll("orientation");
  const recherche = getAll("recherche");
  const sexe = getAll("sexe");
  const ageMin = searchParams.get?.("ageMin") || null;
  const ageMax = searchParams.get?.("ageMax") || null;
  const localisation = searchParams.get?.("localisation") || "";
  const photo = searchParams.get?.("photo");
  const description = searchParams.get?.("description");
  const enLigne = searchParams.get?.("enLigne");

  const where = {
    ...(pseudo && { pseudo: { contains: pseudo } }),
    ...(localisation && { localisation: { contains: localisation } }),
    ...(photo === "true" && { photoUrl: { not: null } }),
    ...(description === "true" && { description: { not: null } }),
    ...(enLigne === "true" && { statut: "en_ligne" }),
    ...(ageMin && ageMax && { age: { gte: parseInt(ageMin), lte: parseInt(ageMax) } }),
    ...(type.length && { type: { in: type } }),
    ...(orientation.length && { orientation: { in: orientation } }),
    ...(recherche.length && { rechercheType: { in: recherche } }),
    ...(sexe.length && { sexe: { in: sexe } }),
  };

  const utilisateurs = await prisma.utilisateur.findMany({
    where,
    select: {
      id: true,
      pseudo: true,
      age: true,
      photoUrl: true,
      localisation: true,
      sexe: true,
      description: true,
    },
  });

  return (
    <div className="recherche-resultats">
      <h1>Résultats de recherche</h1>
      {utilisateurs.length === 0 && <p>Aucun utilisateur trouvé.</p>}
      <ul>
        {utilisateurs.map((u) => (
          <li key={u.id} className="resultat-item">
            {u.photoUrl && (
              <img src={u.photoUrl} className="resultat-photo" alt={u.pseudo} />
            )}
            <div>
              <strong>{u.pseudo}</strong> ({u.age} ans) - {u.localisation}
              <p>{u.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
