import { prisma } from "../../../lib/prisma";

import { NextResponse } from "next/server";
import { getIdsUtilisateursExclus } from "../../../lib/utilsFiltrage";
import { getUserFromToken } from "../../../lib/auth";
import { cookies } from "next/headers";

// === Helpers pour géoloc ville et calcul de distance ===
async function getCoordsFromVille(ville) {
  if (!ville) return null;
  const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(ville)}&limit=1`);
  const data = await res.json();
  if (data.features && data.features[0]) {
    const [lon, lat] = data.features[0].geometry.coordinates;
    return { lat, lon };
  }
  return null;
}

function distanceKm(lat1, lon1, lat2, lon2) {
  function toRad(v) { return (v * Math.PI) / 180; }
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Fonction pour normaliser la ville (accents/casse/espaces)
function normalizeVille(str) {
  return str
    ? str
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // accents
        .replace(/[^a-z0-9]/g, "")       // tout sauf lettres/chiffres
    : "";
}

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
  const rayon = searchParams.get("rayon") || null;
  const latitude = searchParams.get("latitude");
  const longitude = searchParams.get("longitude");
  const autourDeMoi = searchParams.get("autourDeMoi") === "true";

  // 🔒 Exclusion des utilisateurs bloqués/bloquants
  let exclus = [];
  try {
    const cookieStore = await cookies();
    const user = await getUserFromToken(cookieStore);
    if (user?.id) {
      exclus = await getIdsUtilisateursExclus(user.id);
    }
  } catch (err) {
    console.error("Erreur lors du filtrage des exclus :", err);
    exclus = [];
  }

  // ! NE PAS FILTRER PAR localisation dans le WHERE
  const where = {
    id: { notIn: exclus },
    ...(pseudo.trim() && { pseudo: { contains: pseudo.trim(), mode: "insensitive" } }),
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
    let utilisateurs = await prisma.utilisateur.findMany({
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
        latitude: true,
        longitude: true,
      },
    });

    // --- FILTRE GÉO EN 3 ÉTAPES (priorité autourDeMoi > autour d'une ville > ville exacte) ---
    let logs = "\nRecherche distance : ";

    if (autourDeMoi && latitude && longitude && rayon) {
      // Cas 1 : Autour de moi (prioritaire)
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      const rayonKm = parseFloat(rayon);
      logs += `autour de moi rayon=${rayon}km | coords=${lat},${lon}`;
      if (!isNaN(lat) && !isNaN(lon) && !isNaN(rayonKm)) {
        utilisateurs = utilisateurs.filter(u =>
          u.latitude && u.longitude &&
          distanceKm(lat, lon, u.latitude, u.longitude) <= rayonKm
        );
      }
    }
    else if (localisation && rayon) {
      // Cas 2 : Autour d'une ville
      const ref = await getCoordsFromVille(localisation);
      const rayonKm = parseFloat(rayon);
      logs += `autour de ville='${localisation}' rayon=${rayon}km | coords=${ref ? ref.lat + "," + ref.lon : "??"}`;
      if (ref && !isNaN(rayonKm)) {
        utilisateurs = utilisateurs.filter(u =>
          u.latitude && u.longitude &&
          distanceKm(ref.lat, ref.lon, u.latitude, u.longitude) <= rayonKm
        );
      }
    }
    else if (localisation) {
      // Cas 3 : Les gens de [ville] EXACTEMENT (si rayon absent)
      logs += `uniquement ville='${localisation}' (exact normalisé)`;
      utilisateurs = utilisateurs.filter(u =>
        normalizeVille(u.localisation) === normalizeVille(localisation)
      );
    }
    // Sinon, pas de filtre géo (on affiche tout ou le reste des filtres)

    console.log(logs);
    return NextResponse.json({ utilisateurs });
  } catch (err) {
    console.error("Erreur API recherche :", err, err?.stack);
    return NextResponse.json({ utilisateurs: [] }, { status: 500 });
  }
}
