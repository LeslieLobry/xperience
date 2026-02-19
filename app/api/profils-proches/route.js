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
    // ✅ on récupère distance + filters
    const body = await req.json().catch(() => ({}));
    const { latitude, longitude, distance, filters } = body || {};

    if (!latitude || !longitude) {
      return NextResponse.json([], { status: 200 });
    }

    // Valeur par défaut si jamais le front oublie d’envoyer
    const rayon =
      typeof distance === "number" && !isNaN(distance) ? distance : 20;

    const f = filters || {};

    // ✅ Prisma where (tous les filtres qui peuvent être traités en DB)
    const where = {
      latitude: { not: null },
      longitude: { not: null },
    };

    // --- type (ton URL envoie type=femme etc.) ---
    const typeArr = normalizeArray(f.type);
    if (typeArr.length) {
      // si en DB tu stockes "Femme" / "Homme" etc. mais normalisé côté recherche,
      // on compare en mode insensible à la casse via equals + mode.
      // (Si ton champ `type` est un enum strict, dis-moi et j’adapte.)
      where.OR = typeArr.map((t) => ({ type: { equals: t, mode: "insensitive" } }));
    }

    // --- statut ---
    // UI: "all" ou "en_ligne"
    if (f.statut === "en_ligne") {
      where.statut = "en_ligne";
    }

    // --- âge ---
    // si ton champ age est number en DB
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

    // --- pseudo ---
    if (f.pseudo && String(f.pseudo).trim()) {
      where.pseudo = { contains: String(f.pseudo).trim(), mode: "insensitive" };
    }

    // --- localisation (si quelqu’un met ville + autourDeMoi ça peut arriver) ---
    if (f.localisation && String(f.localisation).trim()) {
      where.localisation = {
        contains: String(f.localisation).trim(),
        mode: "insensitive",
      };
    }

    // --- photo / description (si tes champs existent) ---
    // photo=true => photoUrl non null/non vide
    if (f.photo === true) {
      where.photoUrl = { not: null };
    }
    // description=true => description non vide (si ton champ s’appelle autrement, dis-moi)
    if (f.description === true) {
      // si tu as un champ `description` en DB :
      where.description = { not: null };
    }

    // ✅ IMPORTANT :
    // Si ton schema Prisma n’a pas `description`, Prisma plantera.
    // Dans ce cas, commente juste le bloc description ci-dessus
    // OU donne-moi le nom exact du champ.

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

    // On filtre sur la distance dynamique
    const proches = utilisateurs
      .map((u) => {
        const dist = haversine(latitude, longitude, u.latitude, u.longitude);
        return { ...u, distance: dist };
      })
      .filter((u) => u.distance <= rayon);

    proches.forEach((u) =>
      console.log(`🧭 ${u.pseudo} → ${u.distance.toFixed(2)} km`)
    );

    return NextResponse.json(proches);
  } catch (err) {
    console.error("❌ Erreur API profils-proches :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
