import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const getAll = (key) => {
    const val = searchParams.getAll(key);
    return val.length ? val : searchParams.get(key) ? [searchParams.get(key)] : [];
  };

  const pseudo = searchParams.get("pseudo") || "";
  const type = getAll("type");
  const orientation = getAll("orientation");
  const recherche = getAll("recherche");
  const sexe = getAll("sexe");
  const ageMin = searchParams.get("ageMin") || null;
  const ageMax = searchParams.get("ageMax") || null;
  const localisation = searchParams.get("localisation") || "";
  const photo = searchParams.get("photo");
  const description = searchParams.get("description");
  const enLigne = searchParams.get("enLigne");

  const where = {
    ...(pseudo && { pseudo: { contains: pseudo } }),
    ...(localisation && { localisation: { contains: localisation } }),
    ...(photo === "true" && { photoUrl: { not: null } }),
    ...(description === "true" && { description: { not: null } }),
    ...(enLigne === "true" && { statut: "en_ligne" }),
    ...(ageMin && ageMax && {
      age: { gte: parseInt(ageMin), lte: parseInt(ageMax) },
    }),
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

  return Response.json({ utilisateurs });
}
