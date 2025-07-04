import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import haversine from '../../../lib/haversine';

export async function POST(req) {
  try {
    // On récupère tout le body, y compris la distance !
    const { latitude, longitude, distance } = await req.json();

    if (!latitude || !longitude) {
      return NextResponse.json([], { status: 200 });
    }

    // Valeur par défaut si jamais le front oublie d’envoyer
    const rayon = typeof distance === "number" && !isNaN(distance) ? distance : 20;

    const utilisateurs = await prisma.utilisateur.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        pseudo: true,
        photoUrl: true,
        age: true,
        localisation: true,
        statut: true,
        latitude: true,
        longitude: true,
      },
    });

    // On filtre sur la distance dynamique
    const proches = utilisateurs
      .map((u) => {
        const dist = haversine(latitude, longitude, u.latitude, u.longitude);
        return { ...u, distance: dist };
      })
      .filter((u) => u.distance <= rayon);

    console.log("📍 Position utilisateur :", latitude, longitude, "Rayon:", rayon, "km");
    console.log("👥 Nombre total :", utilisateurs.length);
    proches.forEach((u) =>
      console.log(`🧭 ${u.pseudo} → ${u.distance.toFixed(2)} km`)
    );

    return NextResponse.json(proches);
  } catch (err) {
    console.error("❌ Erreur API profils-proches :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
