import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import haversine from "../../../lib/haversine";

function normalizeToDb(val) {
  return String(val || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
function normalizeArray(arr) {
  return Array.isArray(arr) ? arr.map(normalizeToDb).filter(Boolean) : [];
}

/**
 * Convertit proprement en number:
 * - Prisma Decimal -> Number(decimal)
 * - string "50.12" -> 50.12
 * - string "50,12" -> 50.12
 * - null/undefined -> NaN
 */
function toNumber(val) {
  if (val === null || val === undefined) return NaN;

  // Prisma Decimal (decimal.js) ou autre objet convertible
  if (typeof val === "object" && val !== null) {
    const n = Number(val);
    return Number.isFinite(n) ? n : NaN;
  }

  if (typeof val === "string") {
    const s = val.trim().replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }

  const n = Number(val);
  return Number.isFinite(n) ? n : NaN;
}

function isValidGps(lat, lon) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180
  );
}

/**
 * Bounding box approx (km -> degrees).
 * Utile pour préfiltrer en DB et éviter de charger trop de monde.
 */
function boundingBox(lat, lon, radiusKm) {
  const earthKmPerDegLat = 110.574;
  const earthKmPerDegLon = 111.320 * Math.cos((lat * Math.PI) / 180);

  const dLat = radiusKm / earthKmPerDegLat;
  const dLon = radiusKm / earthKmPerDegLon;

  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLon: lon - dLon,
    maxLon: lon + dLon,
  };
}

export async function POST(req) {
  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🚀 /api/profils-proches CALL");

    const body = await req.json().catch(() => ({}));
    const { latitude, longitude, distance, filters } = body || {};

    console.log("📦 body reçu:", body);

    const userLat = toNumber(latitude);
    const userLon = toNumber(longitude);

    if (!isValidGps(userLat, userLon)) {
      console.log("❌ Latitude/longitude invalides:", { latitude, longitude, userLat, userLon });
      return NextResponse.json([], { status: 200 });
    }

    const rayon =
      typeof distance === "number" && !isNaN(distance)
        ? distance
        : distance != null && distance !== ""
        ? Number(distance)
        : 20;

    const rayonFinal = Number.isFinite(rayon) && rayon > 0 ? rayon : 20;

    console.log("📍 Position user:", userLat, userLon);
    console.log("📏 Rayon:", rayonFinal);

    const f = filters || {};
    console.log("🎛️ Filtres reçus:", f);

    // 📊 DEBUG GLOBAL USERS
    const totalUsers = await prisma.utilisateur.count();
    const usersWithGPS = await prisma.utilisateur.count({
      where: { latitude: { not: null }, longitude: { not: null } },
    });
    console.log("📊 TOTAL USERS:", totalUsers);
    console.log("📊 USERS AVEC GPS:", usersWithGPS);

    // ✅ Base where
    const where = {
      latitude: { not: null },
      longitude: { not: null },
    };

    // (optionnel mais très utile) préfiltre bounding box
    const box = boundingBox(userLat, userLon, rayonFinal);
    where.latitude = { not: null, gte: box.minLat, lte: box.maxLat };
    where.longitude = { not: null, gte: box.minLon, lte: box.maxLon };

    // --- TYPE ---
    const typeArr = normalizeArray(f.type);
    if (typeArr.length) {
      // ⚠️ si type est un ENUM Prisma, "contains" ne marche pas.
      // Ici je garde ta logique, mais je te conseille de passer en equals si tu peux.
      where.OR = typeArr.map((t) => ({
        type: { contains: t, mode: "insensitive" },
      }));
    }

    // --- STATUT ---
    if (f.statut === "en_ligne") {
      where.statut = "en_ligne";
    }

    // --- AGE ---
    const ageMin =
      typeof f.ageMin === "number"
        ? f.ageMin
        : f.ageMin != null && f.ageMin !== ""
        ? Number(f.ageMin)
        : null;
    const ageMax =
      typeof f.ageMax === "number"
        ? f.ageMax
        : f.ageMax != null && f.ageMax !== ""
        ? Number(f.ageMax)
        : null;

    if (!isNaN(ageMin) && ageMin != null && !isNaN(ageMax) && ageMax != null) {
      where.age = { gte: ageMin, lte: ageMax };
    } else if (!isNaN(ageMin) && ageMin != null) {
      where.age = { gte: ageMin };
    } else if (!isNaN(ageMax) && ageMax != null) {
      where.age = { lte: ageMax };
    }

    // --- PSEUDO ---
    if (f.pseudo && String(f.pseudo).trim()) {
      where.pseudo = { contains: String(f.pseudo).trim(), mode: "insensitive" };
    }

    // --- LOCALISATION ---
    if (f.localisation && String(f.localisation).trim()) {
      where.localisation = {
        contains: String(f.localisation).trim(),
        mode: "insensitive",
      };
    }

    // --- PHOTO ---
    if (f.photo === true) {
      // ⚠️ si tu stockes parfois "" (string vide), tu peux renforcer:
      // where.photoUrl = { notIn: [null, ""] }
      where.photoUrl = { not: null };
    }

    // --- DESCRIPTION ---
    if (f.description === true) {
      // Idem: { notIn: [null, ""] } si nécessaire
      where.description = { not: null };
    }

    console.log("🔎 WHERE PRISMA:", where);

    const utilisateurs = await prisma.utilisateur.findMany({
      where,
      select: {
        id: true,
        pseudo: true,
        photoUrl: true,
        type: true,
        age: true,
        localisation: true,
        statut: true,
        latitude: true,
        longitude: true,
        verificationIdentiteStatut: true,
      },
    });

    console.log("👥 USERS après filtres Prisma:", utilisateurs.length);

    // DISTANCE
    const proches = [];
    let invalidGpsCount = 0;
    let nanDistCount = 0;

    for (const u of utilisateurs) {
      const uLat = toNumber(u.latitude);
      const uLon = toNumber(u.longitude);

      if (!isValidGps(uLat, uLon)) {
        invalidGpsCount++;
        console.log("⚠️ GPS invalide en BDD:", u.pseudo, u.latitude, u.longitude);
        continue;
      }

      const dist = haversine(userLat, userLon, uLat, uLon);

      if (!Number.isFinite(dist)) {
        nanDistCount++;
        console.log("⚠️ Distance NaN:", u.pseudo, { userLat, userLon, uLat, uLon });
        continue;
      }

      if (dist <= rayonFinal) {
        proches.push({ ...u, latitude: uLat, longitude: uLon, distance: dist });
      }
    }

    console.log("📌 USERS après filtre distance:", proches.length);
    console.log("🧨 GPS invalides:", invalidGpsCount);
    console.log("🧨 distances NaN:", nanDistCount);

    proches.forEach((u) =>
      console.log(`🧭 ${u.pseudo} → ${u.distance.toFixed(2)} km`)
    );

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    return NextResponse.json(proches);
  } catch (err) {
    console.error("❌ Erreur API profils-proches :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}