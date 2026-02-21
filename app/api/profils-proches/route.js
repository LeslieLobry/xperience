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

export async function POST(req) {
  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🚀 /api/profils-proches CALL");

    const body = await req.json().catch(() => ({}));
    const { latitude, longitude, distance, filters } = body || {};

    console.log("📦 body reçu:", body);

    if (!latitude || !longitude) {
      console.log("❌ Pas de latitude/longitude reçus");
      return NextResponse.json([], { status: 200 });
    }

    const rayon =
      typeof distance === "number" && !isNaN(distance) ? distance : 20;

    console.log("📍 Position user:", latitude, longitude);
    console.log("📏 Rayon:", rayon);

    const f = filters || {};
    console.log("🎛️ Filtres reçus:", f);

    // 📊 DEBUG GLOBAL USERS
    const totalUsers = await prisma.utilisateur.count();
    const usersWithGPS = await prisma.utilisateur.count({
      where: {
        latitude: { not: null },
        longitude: { not: null },
      },
    });

    console.log("📊 TOTAL USERS:", totalUsers);
    console.log("📊 USERS AVEC GPS:", usersWithGPS);

    const where = {
      latitude: { not: null },
      longitude: { not: null },
    };

    // --- TYPE ---
    const typeArr = normalizeArray(f.type);
    if (typeArr.length) {
      where.OR = typeArr.map((t) => ({
        type: { contains: t, mode: "insensitive" }, // 👈 contains au lieu de equals
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
      where.photoUrl = { not: null };
    }

    // --- DESCRIPTION ---
    if (f.description === true) {
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
    const proches = utilisateurs
      .map((u) => {
        const dist = haversine(latitude, longitude, u.latitude, u.longitude);
        return { ...u, distance: dist };
      })
      .filter((u) => u.distance <= rayon);

    console.log("📌 USERS après filtre distance:", proches.length);

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