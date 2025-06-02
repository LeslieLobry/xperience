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
  const statut = searchParams.get("statut") || "all";

  // Nouveaux champs
  const experience = getAll("experience");
  const rechercheType = getAll("rechercheType");
  const fumeur = getAll("fumeur");
  const silhouette = getAll("silhouette");
  const taille = getAll("taille");
  const origines = getAll("origines");
  const yeux = getAll("yeux");
  const cheveux = getAll("cheveux");

  const where = {
    ...(pseudo && { pseudo: { contains: pseudo, mode: "insensitive" } }),
    ...(localisation && { localisation: { contains: localisation, mode: "insensitive" } }),
    ...(photo === "true" && { photoUrl: { not: null } }),
    ...(description === "true" && { description: { not: null } }),
    ...(statut === "en_ligne" && { statut: "en_ligne" }),
    ...(ageMin && ageMax && {
      age: { gte: parseInt(ageMin), lte: parseInt(ageMax) },
    }),
    ...(type.length && { type: { in: type } }),
    ...(orientation.length && { orientation: { in: orientation } }),
    ...(recherche.length && { rechercheType: { in: recherche } }),
    ...(sexe.length && { sexe: { in: sexe } }),
    ...(experience.length && { experience: { in: experience } }),
    ...(rechercheType.length && { rechercheType: { in: rechercheType } }),
    ...(fumeur.length && { fumeur: { in: fumeur } }),
    ...(silhouette.length && { silhouette: { in: silhouette } }),
    ...(taille.length && { taille: { in: taille } }),
    ...(origines.length && { origines: { in: origines } }),
    ...(yeux.length && { yeux: { in: yeux } }),
    ...(cheveux.length && { cheveux: { in: cheveux } }),
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
      experience: true,
      rechercheType: true,
      fumeur: true,
      silhouette: true,
      taille: true,
      origines: true,
      yeux: true,
      cheveux: true,
    },
  });

  return Response.json({ utilisateurs });
}
