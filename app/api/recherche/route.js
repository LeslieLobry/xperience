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
  const statut = searchParams.get("statut") || "all"; // 👈 nouveau champ (all / en_ligne)

  const where = {
    ...(pseudo && { pseudo: { contains: pseudo, mode: "insensitive" } }),
    ...(localisation && { localisation: { contains: localisation, mode: "insensitive" } }),
    ...(photo === "true" && { photoUrl: { not: null } }),
    ...(description === "true" && { description: { not: null } }),
    ...(statut === "en_ligne" && { statut: "en_ligne" }), // 👈 filtre uniquement si "en_ligne"
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
      statut: true,
    },
  });

  return Response.json({ utilisateurs });
}
