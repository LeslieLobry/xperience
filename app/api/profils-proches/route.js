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

    const {
      latitude,
      longitude,
      distance,
      filters,
      debugId, // 👈 IMPORTANT
    } = body || {};

    console.log("📦 body reçu:", body);

    const userLat = toNumber(latitude);
    const userLon = toNumber(longitude);

    if (!isValidGps(userLat, userLon)) {
      console.log("❌ Latitude/longitude invalides");
      return NextResponse.json([], { status: 200 });
    }

    const distParsed = toNumber(distance);
    const rayonFinal =
      Number.isFinite(distParsed) && distParsed > 0 ? distParsed : 20;

    console.log("📍 Position user:", userLat, userLon);
    console.log("📏 Rayon:", rayonFinal);

    const box = boundingBox(userLat, userLon, rayonFinal);
    console.log("🧰 BOX:", box);

    /* ============================================================
       🧪 DEBUG CIBLÉ SUR UN ID
    ============================================================ */

    if (debugId != null) {
      const target = await prisma.utilisateur.findUnique({
        where: { id: Number(debugId) },
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

      console.log("🧪 DEBUG TARGET:", target);

      if (target) {
        const tLat = toNumber(target.latitude);
        const tLon = toNumber(target.longitude);

        console.log("🧪 parsed GPS:", { tLat, tLon });
        console.log("🧪 isValidGps:", isValidGps(tLat, tLon));

        const inBox =
          isValidGps(tLat, tLon) &&
          tLat >= box.minLat &&
          tLat <= box.maxLat &&
          tLon >= box.minLon &&
          tLon <= box.maxLon;

        console.log("🧪 inBox:", inBox);

        const dist = isValidGps(tLat, tLon)
          ? haversine(userLat, userLon, tLat, tLon)
          : NaN;

        console.log("🧪 distance réelle:", dist);

        if (Number.isFinite(dist)) {
          console.log("🧪 distance <= rayon ?", dist <= rayonFinal);
        }

        const f = filters || {};

        if (Array.isArray(f.type) && f.type.length) {
          console.log(
            "🧪 type match:",
            f.type.includes(target.type),
            "filtre:",
            f.type,
            "valeur:",
            target.type
          );
        }

        if (f.statut === "en_ligne") {
          console.log(
            "🧪 statut match:",
            target.statut === "en_ligne",
            "valeur:",
            target.statut
          );
        }

        if (f.photo === true) {
          console.log(
            "🧪 photo ok:",
            !!(target.photoUrl && String(target.photoUrl).trim())
          );
        }

        if (f.description === true) {
          console.log(
            "🧪 description ok:",
            !!(target.description && String(target.description).trim())
          );
        }
      } else {
        console.log("🧪 Profil introuvable avec cet ID.");
      }
    }

    /* ============================================================
       🔍 FILTRAGE NORMAL
    ============================================================ */

    const AND = [];

    AND.push({ latitude: { not: null } });
    AND.push({ longitude: { not: null } });

    AND.push({ latitude: { gte: box.minLat, lte: box.maxLat } });
    AND.push({ longitude: { gte: box.minLon, lte: box.maxLon } });

    const f = filters || {};

    if (Array.isArray(f.type) && f.type.length) {
      AND.push({ type: { in: f.type } });
    }

    if (f.statut === "en_ligne") {
      AND.push({ statut: "en_ligne" });
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
      },
    });

    console.log("👥 USERS après Prisma:", utilisateurs.length);

    /* -------------------- Distance finale -------------------- */

    const proches = [];

    for (const u of utilisateurs) {
      const uLat = toNumber(u.latitude);
      const uLon = toNumber(u.longitude);

      if (!isValidGps(uLat, uLon)) continue;

      const dist = haversine(userLat, userLon, uLat, uLon);

      if (Number.isFinite(dist) && dist <= rayonFinal) {
        proches.push({ ...u, distance: dist });
      }
    }

    proches.sort((a, b) => a.distance - b.distance);

    console.log("📌 USERS après distance:", proches.length);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    return NextResponse.json(proches);
  } catch (err) {
    console.error("❌ Erreur API profils-proches :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}