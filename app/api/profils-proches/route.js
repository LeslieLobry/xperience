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

  // sécurité (au cas où)
  const safeLon = earthKmPerDegLon === 0 ? 0.000001 : earthKmPerDegLon;

  const dLat = radiusKm / earthKmPerDegLat;
  const dLon = radiusKm / safeLon;

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
    const { latitude, longitude, distance, filters /*, userId*/ } = body || {};

    console.log("📦 body reçu:", body);

    const userLat = toNumber(latitude);
    const userLon = toNumber(longitude);

    if (!isValidGps(userLat, userLon)) {
      console.log("❌ Latitude/longitude invalides:", {
        latitude,
        longitude,
        userLat,
        userLon,
      });
      return NextResponse.json([], { status: 200 });
    }

    // ✅ distance robuste (number OU string)
    const distParsed = toNumber(distance);
    const rayonFinal = Number.isFinite(distParsed) && distParsed > 0 ? distParsed : 20;

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

    // ✅ Construire un AND propre
    const AND = [];

    // Base GPS
    AND.push({ latitude: { not: null } });
    AND.push({ longitude: { not: null } });

    // Bounding box
    const box = boundingBox(userLat, userLon, rayonFinal);
    AND.push({ latitude: { gte: box.minLat, lte: box.maxLat } });
    AND.push({ longitude: { gte: box.minLon, lte: box.maxLon } });

    console.log("🧰 BOX:", box);

    // --- TYPE ---
    // ⚠️ Si "type" est un ENUM Prisma: contains ne marche pas.
    // => On préfère "in" avec les valeurs reçues par le front (sans normalize).
    // Si tu as des valeurs en DB genre "HOMME/FEMME/COUPLE/GROUPE", ajuste ici.
    const typeRaw = Array.isArray(f.type) ? f.type.filter(Boolean) : [];
    if (typeRaw.length) {
      AND.push({ type: { in: typeRaw } });
    }

    // --- STATUT ---
    if (f.statut === "en_ligne") {
      AND.push({ statut: "en_ligne" });
    }

    // --- AGE ---
    const ageMin = toNumber(f.ageMin);
    const ageMax = toNumber(f.ageMax);

    if (Number.isFinite(ageMin) && Number.isFinite(ageMax)) {
      AND.push({ age: { gte: ageMin, lte: ageMax } });
    } else if (Number.isFinite(ageMin)) {
      AND.push({ age: { gte: ageMin } });
    } else if (Number.isFinite(ageMax)) {
      AND.push({ age: { lte: ageMax } });
    }

    // --- PSEUDO ---
    if (f.pseudo && String(f.pseudo).trim()) {
      AND.push({
        pseudo: { contains: String(f.pseudo).trim(), mode: "insensitive" },
      });
    }

    // --- LOCALISATION ---
    if (f.localisation && String(f.localisation).trim()) {
      AND.push({
        localisation: {
          contains: String(f.localisation).trim(),
          mode: "insensitive",
        },
      });
    }

    // --- PHOTO ---
    if (f.photo === true) {
      AND.push({ photoUrl: { notIn: [null, ""] } });
    }

    // --- DESCRIPTION ---
    if (f.description === true) {
      AND.push({ description: { notIn: [null, ""] } });
    }

    // (optionnel) Exclure l’utilisateur courant si tu l’envoies dans body.userId
    // if (userId) AND.push({ id: { not: userId } });

    const where = { AND };

    console.log("🔎 WHERE PRISMA:", JSON.stringify(where, null, 2));

    // 🧪 Debug : combien dans la box AVANT les autres filtres
    const inBoxCount = await prisma.utilisateur.count({
      where: {
        AND: [
          { latitude: { not: null } },
          { longitude: { not: null } },
          { latitude: { gte: box.minLat, lte: box.maxLat } },
          { longitude: { gte: box.minLon, lte: box.maxLon } },
        ],
      },
    });
    console.log("📦 USERS dans la BOX:", inBoxCount);

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

    console.log("👥 USERS après where Prisma:", utilisateurs.length);

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

    // ✅ tri par distance
    proches.sort((a, b) => a.distance - b.distance);

    console.log("📌 USERS après filtre distance:", proches.length);
    console.log("🧨 GPS invalides:", invalidGpsCount);
    console.log("🧨 distances NaN:", nanDistCount);

    proches.slice(0, 30).forEach((u) =>
      console.log(`🧭 ${u.pseudo} → ${u.distance.toFixed(2)} km`)
    );

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    return NextResponse.json(proches);
  } catch (err) {
    console.error("❌ Erreur API profils-proches :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}