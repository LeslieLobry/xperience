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
    `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(ville)}&limit=1`
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
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
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

  // alias accepté: localisation OU ville
  const localisation =
    searchParams.get("localisation") || searchParams.get("ville") || "";

  const photo = searchParams.get("photo") === "true";
  const description = searchParams.get("description") === "true";

  // statut: all | en_ligne | hors_ligne
  const statut = searchParams.get("statut") || "all";

  // Rayon/coords
  const rayonRaw = searchParams.get("rayon");
  const rayon = Number.isFinite(parseFloat(rayonRaw))
    ? parseFloat(rayonRaw)
    : 0;

  const latitude = parseFloat(searchParams.get("latitude") || "NaN");
  const longitude = parseFloat(searchParams.get("longitude") || "NaN");

  const autourDeMoi = searchParams.get("autourDeMoi") === "true";

  // --- Normalisation + singularisation ---
  const typeNorm = normalizeAndSingularizeArray(type);
  const orientationNorm = normalizeAndSingularizeArray(orientation);
  const rechercheTypeNorm = normalizeAndSingularizeArray(rechercheType);
  const experienceNorm = normalizeAndSingularizeArray(experience);
  const fumeurNorm = normalizeAndSingularizeArray(fumeur);
  const silhouetteNorm = normalizeAndSingularizeArray(silhouette);
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
      exclus = Array.isArray(exclus) ? exclus : [];
    }
  } catch (err) {
    console.error("Erreur filtrage exclus :", err);
    exclus = [];
  }

  // Construction du where Prisma
  const andParts = [];

  if (pseudo.trim()) {
    andParts.push({
      pseudo: { contains: pseudo.trim(), mode: "insensitive" },
    });
  }

  if (photo) andParts.push({ photoUrl: { not: null } });
  if (description) andParts.push({ description: { not: null } });

  // âge
  if (ageMin || ageMax) {
    const ageFilter = {};
    if (ageMin) ageFilter.gte = parseInt(ageMin, 10);
    if (ageMax) ageFilter.lte = parseInt(ageMax, 10);
    andParts.push({ age: ageFilter });
  }

  if (typeNorm.length) {
    andParts.push({
      OR: typeNorm.map((t) => ({
        type: { equals: t, mode: "insensitive" },
      })),
    });
  }

  if (rechercheTypeNorm.length) {
    andParts.push({ rechercheType: { in: rechercheTypeNorm } });
  }

  if (experienceNorm.length) {
    andParts.push({ experience: { in: experienceNorm } });
  }

  if (fumeurNorm.length) {
    andParts.push({ fumeur: { in: fumeurNorm } });
  }

  if (silhouetteNorm.length) {
    andParts.push({ silhouette: { in: silhouetteNorm } });
  }

  if (taille.length) {
    andParts.push({
      taille: { in: taille.map((t) => parseInt(t, 10) || -1) },
    });
  }

  if (originesNorm.length) {
    andParts.push({ origines: { in: originesNorm } });
  }

  if (yeuxNorm.length) {
    andParts.push({ yeux: { in: yeuxNorm } });
  }

  if (orientationNorm.length) {
    andParts.push({
      OR: orientationNorm.map((o) => ({
        orientation: { equals: o, mode: "insensitive" },
      })),
    });
  }

  if (cheveuxNorm.length) {
    andParts.push({
      OR: cheveuxNorm.map((c) => ({
        cheveux: { contains: c, mode: "insensitive" },
      })),
    });
  }

  // ✅ Filtre visible/invisible : respecte le mode invisible
  if (statut === "en_ligne") {
    andParts.push({ statut: "en_ligne" });
  } else if (statut === "hors_ligne") {
    andParts.push({ statut: "hors_ligne" });
  }

  const where = {
    id: { notIn: exclus },
    ...(andParts.length ? { AND: andParts } : {}),
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
        statutAuto: true,
        lastSeenAt: true,

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

    // --- Filtrage géographique ---
    let logs = "\nRecherche distance : ";
    const hasCoords = (lat, lon) => !isNaN(lat) && !isNaN(lon);

    const mode = autourDeMoi ? "NEAR_ME" : localisation ? "CITY" : "NONE";

    if (mode === "NEAR_ME") {
      const r = rayon || DEFAULT_RAYON;
      logs += `mode=NEAR_ME rayon=${r}km coords=${latitude},${longitude}`;

      if (hasCoords(latitude, longitude)) {
        utilisateurs = utilisateurs.filter(
          (u) =>
            u.latitude != null &&
            u.longitude != null &&
            distanceKm(latitude, longitude, u.latitude, u.longitude) <= r
        );
      } else {
        logs += " (coords manquantes → pas de filtre distance)";
      }
    } else if (mode === "CITY") {
      const r = rayon || DEFAULT_RAYON;
      logs += `mode=CITY ville='${localisation}' rayon=${r}km`;

      if (hasCoords(latitude, longitude)) {
        utilisateurs = utilisateurs.filter(
          (u) =>
            u.latitude != null &&
            u.longitude != null &&
            distanceKm(latitude, longitude, u.latitude, u.longitude) <= r
        );
      } else {
        const ref = await getCoordsFromVille(localisation);
        if (ref) {
          utilisateurs = utilisateurs.filter(
            (u) =>
              u.latitude != null &&
              u.longitude != null &&
              distanceKm(ref.lat, ref.lon, u.latitude, u.longitude) <= r
          );
        } else {
          logs += " (géocodage KO → fallback match texte exact)";
          utilisateurs = utilisateurs.filter(
            (u) => normalizeVille(u.localisation) === normalizeVille(localisation)
          );
        }
      }
    } else {
      logs += "mode=NONE (pas de filtre distance)";
    }

    console.log(logs);
    return NextResponse.json({ utilisateurs });
  } catch (err) {
    console.error("Erreur API recherche :", err);
    return NextResponse.json({ utilisateurs: [] }, { status: 500 });
  }
}