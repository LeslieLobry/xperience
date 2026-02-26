import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import haversine from "../../../lib/haversine";

/* -------------------- Utils -------------------- */

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

function boundingBox(lat, lon, radiusKm) {
  const earthKmPerDegLat = 110.574;
  const earthKmPerDegLon = 111.320 * Math.cos((lat * Math.PI) / 180);
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

/* -------------------- API -------------------- */

export async function POST(req) {
  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🚀 /api/profils-proches CALL");

    const body = await req.json().catch(() => ({}));
    const { latitude, longitude, distance, filters, debugId } = body || {};

    console.log("📦 body reçu:", body);

    const userLat = toNumber(latitude);
    const userLon = toNumber(longitude);

    if (!isValidGps(userLat, userLon)) {
      console.log("❌ Latitude/longitude invalides:", { latitude, longitude });
      return NextResponse.json({ proches: [], debug: null }, { status: 200 });
    }

    const distParsed = toNumber(distance);
    const rayonFinal =
      Number.isFinite(distParsed) && distParsed > 0 ? distParsed : 20;

    console.log("📍 Position user:", userLat, userLon);
    console.log("📏 Rayon:", rayonFinal);

    const box = boundingBox(userLat, userLon, rayonFinal);
    console.log("🧰 BOX:", box);

    // ✅ debug renvoyé au navigateur
    let debug = null;
    const debugIdNum =
      debugId != null && String(debugId).trim() !== ""
        ? Number(String(debugId).trim())
        : null;

    /* ============================================================
       🧪 DEBUG CIBLÉ SUR UN ID (RENVOYÉ DANS LA RÉPONSE)
    ============================================================ */
    if (Number.isFinite(debugIdNum)) {
      const target = await prisma.utilisateur.findUnique({
        where: { id: debugIdNum },
        select: {
          id: true,
          pseudo: true,
          type: true,
          age: true,
          localisation: true,
          statut: true,
          photoUrl: true,
          description: true,
          latitude: true,
          longitude: true,
        },
      });

      if (!target) {
        debug = { debugId: debugIdNum, exists: false };
      } else {
        const tLat = toNumber(target.latitude);
        const tLon = toNumber(target.longitude);

        const valid = isValidGps(tLat, tLon);
        const inBox =
          valid &&
          tLat >= box.minLat &&
          tLat <= box.maxLat &&
          tLon >= box.minLon &&
          tLon <= box.maxLon;

        const dist = valid ? haversine(userLat, userLon, tLat, tLon) : null;

        debug = {
          debugId: debugIdNum,
          exists: true,
          target,
          parsedGps: { tLat, tLon },
          isValidGps: valid,
          inBox,
          distance: dist,
          rayonFinal,
          wouldPassDistance: dist != null ? dist <= rayonFinal : false,
        };

        console.log("🧪 DEBUG:", debug);
      }
    }

    /* ============================================================
       🔍 FILTRAGE NORMAL
    ============================================================ */

    const f = filters || {};
    const AND = [];

    // base GPS + bounding box
    AND.push({ latitude: { not: null } });
    AND.push({ longitude: { not: null } });
    AND.push({ latitude: { gte: box.minLat, lte: box.maxLat } });
    AND.push({ longitude: { gte: box.minLon, lte: box.maxLon } });

    // --- TYPE (ENUM) ---
    if (Array.isArray(f.type) && f.type.length) {
      AND.push({ type: { in: f.type.filter(Boolean) } });
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

    const where = { AND };
    console.log("🔎 WHERE PRISMA:", JSON.stringify(where, null, 2));

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

    console.log("👥 USERS après Prisma:", utilisateurs.length);

    /* -------------------- Distance finale -------------------- */

    const proches = [];
    let invalidGps = 0;
    let nanDist = 0;

    for (const u of utilisateurs) {
      const uLat = toNumber(u.latitude);
      const uLon = toNumber(u.longitude);

      if (!isValidGps(uLat, uLon)) {
        invalidGps++;
        continue;
      }

      const dist = haversine(userLat, userLon, uLat, uLon);
      if (!Number.isFinite(dist)) {
        nanDist++;
        continue;
      }

      if (dist <= rayonFinal) {
        proches.push({ ...u, distance: dist });
      }
    }

    proches.sort((a, b) => a.distance - b.distance);

    console.log("📌 USERS après distance:", proches.length);
    console.log("🧨 invalidGps:", invalidGps, "nanDist:", nanDist);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // ✅ IMPORTANT: on renvoie debug au navigateur
    return NextResponse.json({ proches, debug });
  } catch (err) {
    console.error("❌ Erreur API profils-proches :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}