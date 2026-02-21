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

    // ✅ on récupère distance + filters
    const body = await req.json().catch(() => ({}));
    const { latitude, longitude, distance, filters } = body || {};

    console.log("📦 body reçu:", body);

    if (!latitude || !longitude) {
      console.log("❌ Pas de latitude/longitude reçus");
      return NextResponse.json(
        {
          proches: [],
          debug: {
            error: "NO_GEO",
            message: "Pas de latitude/longitude reçus",
            body,
          },
        },
        { status: 200 }
      );
    }

    // Valeur par défaut si jamais le front oublie d’envoyer
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

    // ✅ Prisma where (tous les filtres qui peuvent être traités en DB)
    const where = {
      latitude: { not: null },
      longitude: { not: null },
    };

    // --- TYPE ---
    const typeArr = normalizeArray(f.type);
    if (typeArr.length) {
      // ✅ plus tolérant que equals
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
      // (optionnel) si tu veux exclure les "" aussi : { notIn: [null, ""] }
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

    // ✅ filtre distance
    const proches = utilisateurs
      .map((u) => {
        const dist = haversine(latitude, longitude, u.latitude, u.longitude);
        return { ...u, distance: dist };
      })
      .filter((u) => u.distance <= rayon);

    console.log("📌 USERS après filtre distance:", proches.length);

    // (optionnel) sample
    proches.slice(0, 10).forEach((u) =>
      console.log(`🧭 ${u.pseudo} → ${Number(u.distance).toFixed(2)} km`)
    );

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // ✅ IMPORTANT : on renvoie debug POUR LA CONSOLE NAVIGATEUR
    return NextResponse.json({
      proches,
      debug: {
        totalUsers,
        usersWithGPS,
        afterPrisma: utilisateurs.length,
        afterDistance: proches.length,
        rayon,
        userPos: { latitude, longitude },
        filters: f,
        where,
      },
    });
  } catch (err) {
    console.error("❌ Erreur API profils-proches :", err);
    return NextResponse.json(
      { error: "Erreur serveur", details: String(err?.message || err) },
      { status: 500 }
    );
  }
}