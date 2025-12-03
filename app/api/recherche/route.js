// app/api/recherche/route.js

import { prisma } from "../../../lib/prisma";
import { NextResponse } from "next/server";
import { getIdsUtilisateursExclus } from "../../../lib/utilsFiltrage";
import { getUserFromToken } from "../../../lib/auth";
import { cookies } from "next/headers";

// === Helpers ===

const DEFAULT_RAYON = 20;

// Normalise une valeur (lowercase + sans accents)
function normalizeToDb(val) {
  return val
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Supprime le "s" final pour uniformiser singulier/pluriel
function singularize(v) {
  return v.endsWith("s") ? v.slice(0, -1) : v;
}

// Applique normalization + singularisation + dédoublonnage
function normalizeAndSingularizeArray(arr) {
  const set = new Set(arr.map(normalizeToDb).map(singularize));
  return [...set];
}

async function getCoordsFromVille(ville) {
  if (!ville) return null;
  const res = await fetch(
    `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
      ville
    )}&limit=1`
  );
  const data = await res.json();
  if (data.features?.[0]) {
    const [lon, lat] = data.features[0].geometry.coordinates;
    return { lat, lon };
  }
  return null;
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeVille(str) {
  return str
    ? str
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "")
    : "";
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const getAll = (key) => {
    const vals = searchParams.getAll(key);
    if (vals.length) return vals;
    const one = searchParams.get(key);
    return one ? [one] : [];
  };

  // Récupération brute des filtres
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

  // ⚠️ alias accepté: localisation OU ville
  const localisation =
    searchParams.get("localisation") ||
    searchParams.get("ville") ||
    "";

  const photo = searchParams.get("photo") === "true";
  const description = searchParams.get("description") === "true";
  const statut = searchParams.get("statut") || "all";

  // Rayon/coords (peuvent être absents)
  const rayonRaw = searchParams.get("rayon");
  const rayon = Number.isFinite(parseFloat(rayonRaw))
    ? parseFloat(rayonRaw)
    : 0;

  const latitude = parseFloat(
    searchParams.get("latitude") || "NaN"
  );
  const longitude = parseFloat(
    searchParams.get("longitude") || "NaN"
  );

  const autourDeMoi = searchParams.get("autourDeMoi") === "true";

  // --- Normalisation + singularisation ---
  const typeNorm = normalizeAndSingularizeArray(type);
  const orientationNorm =
    normalizeAndSingularizeArray(orientation);
  const rechercheTypeNorm =
    normalizeAndSingularizeArray(rechercheType);
  const experienceNorm =
    normalizeAndSingularizeArray(experience);
  const fumeurNorm = normalizeAndSingularizeArray(fumeur);
  const silhouetteNorm =
    normalizeAndSingularizeArray(silhouette);
  const originesNorm = normalizeAndSingularizeArray(origines);
  const yeuxNorm = normalizeAndSingularizeArray(yeux);
  const cheveuxNorm = normalizeAndSingularizeArray(cheveux);

  // 🔒 Exclusion des utilisateurs bloqués
  let exclus = [];
  try {
    const cookieStore = await cookies();
    const user = await getUserFromToken(cookieStore);
    if (user?.id) {
      exclus = await getIdsUtilisateursExclus(user.id);
    }
  } catch (err) {
    console.error("Erreur filtrage exclus :", err);
    exclus = [];
  }

  // Construction du where pour Prisma
  const where = {
    id: { notIn: exclus },
    ...(pseudo.trim() && {
      pseudo: { contains: pseudo.trim(), mode: "insensitive" },
    }),
    ...(photo && { photoUrl: { not: null } }),
    ...(description && { description: { not: null } }),
    ...(statut === "en_ligne" && { statut: "en_ligne" }),

    // 🔥 Filtre d'âge flexible (ageMin seul, ageMax seul, ou les deux)
    ...(() => {
      if (!ageMin && !ageMax) return {};
      const ageFilter = {};
      if (ageMin) ageFilter.gte = parseInt(ageMin, 10);
      if (ageMax) ageFilter.lte = parseInt(ageMax, 10);
      return { age: ageFilter };
    })(),

    ...(typeNorm.length && {
      type: { in: typeNorm, mode: "insensitive" },
    }),
    ...(orientationNorm.length && {
      OR: orientationNorm.map((o) => ({
        orientation: { equals: o, mode: "insensitive" },
      })),
    }),
    ...(rechercheTypeNorm.length && {
      rechercheType: {
        in: rechercheTypeNorm,
        mode: "insensitive",
      },
    }),
    ...(experienceNorm.length && {
      experience: { in: experienceNorm, mode: "insensitive" },
    }),
    ...(fumeurNorm.length && {
      fumeur: { in: fumeurNorm, mode: "insensitive" },
    }),
    ...(silhouetteNorm.length && {
      silhouette: {
        in: silhouetteNorm,
        mode: "insensitive",
      },
    }),
    ...(taille.length && {
      taille: { in: taille.map((t) => parseInt(t, 10) || -1) },
    }),
    ...(originesNorm.length && {
      origines: { in: originesNorm, mode: "insensitive" },
    }),
    ...(yeuxNorm.length && {
      yeux: { in: yeuxNorm, mode: "insensitive" },
    }),
    // ---> on garde le contains pour cheveux
    ...(cheveuxNorm.length && {
      OR: cheveuxNorm.map((c) => ({
        cheveux: { contains: c, mode: "insensitive" },
      })),
    }),
  };

  try {
    // Requête principale
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
        verificationIdentiteStatut: true,
      },
    });

    // --- Filtrage géographique (modes exclusifs) ---
    let logs = "\nRecherche distance : ";
    const hasCoords = (lat, lon) =>
      !isNaN(lat) && !isNaN(lon);

    // Tranche explicitement le mode (si les deux arrivent, on priorise NEAR_ME)
    const mode = autourDeMoi
      ? "NEAR_ME"
      : localisation
      ? "CITY"
      : "NONE";

    if (mode === "NEAR_ME") {
      // Mode AUTOUR DE MOI : on ignore la ville
      const r = rayon || DEFAULT_RAYON;
      logs += `mode=NEAR_ME rayon=${r}km coords=${latitude},${longitude}`;
      if (hasCoords(latitude, longitude)) {
        utilisateurs = utilisateurs.filter(
          (u) =>
            u.latitude != null &&
            u.longitude != null &&
            distanceKm(
              latitude,
              longitude,
              u.latitude,
              u.longitude
            ) <= r
        );
      } else {
        logs +=
          " (coords manquantes → pas de filtre distance)";
      }
    } else if (mode === "CITY") {
      // Mode VILLE : on ignore autourDeMoi
      const r = rayon || DEFAULT_RAYON;
      logs += `mode=CITY ville='${localisation}' rayon=${r}km`;

      // 1) Si coords déjà fournies par le front (autocomplétion / voix géocodée)
      if (hasCoords(latitude, longitude)) {
        utilisateurs = utilisateurs.filter(
          (u) =>
            u.latitude != null &&
            u.longitude != null &&
            distanceKm(
              latitude,
              longitude,
              u.latitude,
              u.longitude
            ) <= r
        );
      } else {
        // 2) Sinon, géocode côté serveur à partir de la ville
        const ref = await getCoordsFromVille(localisation);
        if (ref) {
          utilisateurs = utilisateurs.filter(
            (u) =>
              u.latitude != null &&
              u.longitude != null &&
              distanceKm(
                ref.lat,
                ref.lon,
                u.latitude,
                u.longitude
              ) <= r
          );
        } else {
          // 3) Fallback: match texte exact (moins fiable)
          logs +=
            " (géocodage KO → fallback match texte exact)";
          utilisateurs = utilisateurs.filter(
            (u) =>
              normalizeVille(u.localisation) ===
              normalizeVille(localisation)
          );
        }
      }
    } else {
      // Pas de ville, pas autour de moi → aucun filtre distance
      logs += "mode=NONE (pas de filtre distance)";
    }

    console.log(logs);
    return NextResponse.json({ utilisateurs });
  } catch (err) {
    console.error("Erreur API recherche :", err);
    return NextResponse.json(
      { utilisateurs: [] },
      { status: 500 }
    );
  }
}
