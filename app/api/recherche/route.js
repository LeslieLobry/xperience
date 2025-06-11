import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

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
  const rechercheType = getAll("rechercheType");
  const experience = getAll("experience");
  const fumeur = getAll("fumeur");
  const silhouette = getAll("silhouette");
  const taille = getAll("taille");
  const origines = getAll("origines");
  const yeux = getAll("yeux");
  const cheveux = getAll("cheveux");
  const ageMin = searchParams.get("ageMin") || null;
  const ageMax = searchParams.get("ageMax") || null;
  const localisation = searchParams.get("localisation") || "";
  const photo = searchParams.get("photo");
  const description = searchParams.get("description");
  const statut = searchParams.get("statut") || "all";

  const where = {
    ...(pseudo.trim() && { pseudo: { contains: pseudo.trim() } }),
    ...(localisation.trim() && { localisation: { contains: localisation.trim() } }),
    ...(photo === "true" && { photoUrl: { not: null } }),
    ...(description === "true" && { description: { not: null } }),
    ...(statut === "en_ligne" && { statut: "en_ligne" }),
    ...(ageMin && ageMax && {
      age: {
        gte: parseInt(ageMin, 10),
        lte: parseInt(ageMax, 10),
      },
    }),
    ...(type.length && { type: { in: type } }),
    ...(orientation.length && { orientation: { in: orientation } }),
    ...(rechercheType.length && { rechercheType: { in: rechercheType } }),
    ...(experience.length && { experience: { in: experience } }),
    ...(fumeur.length && { fumeur: { in: fumeur } }),
    ...(silhouette.length && { silhouette: { in: silhouette } }),
    ...(taille.length && {
      taille: { in: taille.map((t) => parseInt(t) || -1) },
    }),
    ...(origines.length && { origines: { in: origines } }),
    ...(yeux.length && { yeux: { in: yeux } }),
    ...(cheveux.length && { cheveux: { in: cheveux } }),
  };

  try {
    const utilisateurs = await prisma.utilisateur.findMany({
      where,
      select: {
        id: true,
        pseudo: true,
        age: true,
        photoUrl: true,
        localisation: true,
        type: true,
        orientation: true,
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

    return NextResponse.json({ utilisateurs });
  } catch (err) {
    console.error("Erreur API recherche :", err);
    return NextResponse.json({ utilisateurs: [] }, { status: 500 });
  }
}
